# Developer

Clone repository, install dependencies with `yarn install` and run scripts: `yarn run ...`

| Script      | Description                                    |
| ----------- | ---------------------------------------------- |
| `clean`     | Clean compiled files.                          |
| `distclean` | Remove Node modules.                           |
| `lint`      | Run TSLint on project.                         |
| `test`      | Run tests using Jest.                          |
| `example`   | Run example script, `yarn run example schema`. |
| `dist`      | Build library for release.                     |

Publishing library to NPM/GitHub.

```Shell
$ yarn run dist && npm publish --access=public [--tag=beta]
$ git push origin master --tags
```

Add [Code Climate](https://codeclimate.com/) repository token to [Travis CI](https://travis-ci.org/) in `Settings -> Environment Variables`.
