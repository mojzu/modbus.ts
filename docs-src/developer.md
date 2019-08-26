# Developer

Clone repository, install dependencies with `npm install` and run scripts: `npm run ...`

| Script      | Description                |
| ----------- | -------------------------- |
| `clean`     | Clean compiled files.      |
| `distclean` | Remove Node modules.       |
| `lint`      | Run TSLint on project.     |
| `test`      | Run tests using Jest.      |
| `dist`      | Build library for release. |

Update package dependencies.

```shell
sudo npm install -g npm-check-updates
ncu --upgrade
npm install
```

Publish library to NPM and GitHub.

```shell
npm run dist && npm publish --access=public [--tag=beta]
git push origin master --tags
```
