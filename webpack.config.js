/* eslint-disable @typescript-eslint/no-var-requires */
const { resolve } = require("path");
const { existsSync } = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const ReactRefreshWebpackPlugin = require("@pmmmwh/react-refresh-webpack-plugin");
const PortFinder = require("portfinder");

const resolvePath = (path) => resolve(__dirname, path);

const generatePort = async (defaultPort) => {
  try {
    PortFinder.basePort = defaultPort;
    return await PortFinder.getPortPromise();
  } catch (e) {
    throw new Error(e);
  }
};

module.exports = async (env, options) => {
  const isProduction = options.mode === "production";
  const isDevelopment = options.mode === "development";

  const isDevServer = !!env.WEBPACK_SERVE;
  const useSourceMap = !!env.SOURCE_MAP;

  const dotenvFilePath = resolvePath(`./.env.${options.mode}`);

  const config = {
    mode: isProduction ? "production" : "development",
    devtool: isProduction ? (useSourceMap ? "source-map" : false) : isDevelopment && "cheap-module-source-map",
    entry: [resolvePath("src/index.tsx")],
    output: {
      publicPath: "/",
      filename: "js/[name].[chunkhash:6].js",
      path: resolvePath("dist"),
      clean: true
    },
    resolve: {
      alias: {
        "@": resolvePath("src")
      },
      extensions: [".tsx", ".ts", ".jsx", ".js", "json"]
    },
    cache: {
      type: "filesystem"
    },
    optimization: {
      minimize: isProduction,
      minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
      splitChunks: {
        cacheGroups: {
          vendors: {
            test: /node_modules/,
            name: "vendors",
            minChunks: 1,
            chunks: "initial",
            minSize: 0,
            priority: 1
          },
          commons: {
            name: "commons",
            minChunks: 2,
            chunks: "initial",
            minSize: 0
          }
        }
      }
    },
    module: {
      rules: [
        {
          oneOf: [
            {
              test: /\.(ts|tsx)$/,
              exclude: /node_modules/,
              use: [
                {
                  loader: "babel-loader",
                  options: {
                    presets: [
                      [
                        "@babel/preset-env",
                        {
                          useBuiltIns: "usage",
                          corejs: {
                            version: 3
                          }
                        }
                      ],
                      ["@babel/preset-react", { runtime: "automatic" }],
                      "@babel/preset-typescript"
                    ],
                    plugins: ["@babel/plugin-transform-runtime", isDevServer && require.resolve("react-refresh/babel")].filter(Boolean)
                  }
                }
              ]
            },
            {
              test: /\.less$/,
              use: [
                isProduction ? MiniCssExtractPlugin.loader : "style-loader",
                "css-loader",
                {
                  loader: "postcss-loader",
                  options: {
                    postcssOptions: {
                      plugins: [isProduction && require.resolve("autoprefixer")].filter(Boolean)
                    }
                  }
                },
                {
                  loader: "resolve-url-loader"
                },
                {
                  loader: "less-loader",
                  options: {
                    lessOptions: {
                      javascriptEnabled: true
                    }
                  }
                }
              ]
            },
            {
              test: /.(png|jpg|jpeg|gif|svg)$/,
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: 2 * 1024
                }
              },
              generator: {
                filename: "images/[name].[contenthash:6][ext]"
              }
            },
            {
              test: /.(woff2?|eot|ttf|otf)$/,
              type: "asset",
              parser: {
                dataUrlCondition: {
                  maxSize: 2 * 1024
                }
              },
              generator: {
                filename: "fonts/[name].[contenthash:6][ext]"
              }
            },
            {
              test: /.(mp4|webm|ogg|mp3|wav|flac|aac)$/,
              type: "asset/resource",
              generator: {
                filename: "media/[name].[contenthash:6][ext]"
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new webpack.ProgressPlugin(),
      new Dotenv({
        path: existsSync(dotenvFilePath) ? dotenvFilePath : resolvePath("./.env")
      }),
      new HtmlWebpackPlugin({
        template: resolvePath("public/index.html")
      }),
      new ESLintPlugin({
        extensions: ["js", "jsx", "ts", "tsx"],
        threads: true
      }),
      new ForkTsCheckerWebpackPlugin({
        async: isDevelopment,
        typescript: {
          mode: "write-references"
        }
      }),
      isProduction &&
        new CopyWebpackPlugin({
          patterns: [
            {
              from: resolvePath("public"),
              to: resolvePath("dist"),
              filter: (source) => {
                return !source.includes("index.html");
              }
            }
          ]
        }),
      isProduction &&
        new MiniCssExtractPlugin({
          filename: "css/[name].[contenthash:6].css"
        }),
      isDevServer && new ReactRefreshWebpackPlugin()
    ].filter(Boolean)
  };

  const port = await generatePort(3000);

  const devServer = {
    port,
    hot: true,
    historyApiFallback: true,
    static: {
      directory: resolvePath("public")
    }
  };

  return isDevServer ? { ...config, devServer } : config;
};
