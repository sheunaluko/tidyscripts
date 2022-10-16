# Tidyscripts 🧘🏾‍♂️
A documented and clean collection of typescript code for composability and re-use. Created and maintained by Sheun Aluko, MD-MS. 

## About
The holy grail of typescript development lies before you. The Tidyscripts monorepo leverages npm workspaces, vercel and nextjs, and turbo repo to deliver a powerhouse developer experience in a tiny package. At the core is the tidyscripts_common package, which is imported by the tidyscripts_node and tidyscripts_web packages. These, in turn, are imported by the tidyscripts nextjs application, which is deployed on vercel to a global edge computing network. This provides unprecedented full stack typescript library and application development, distribution, and deployment.

Tidyscripts includes libraries for cryptography, functional programming, graphing, financial/cryptocurrency analysis, and much more.

### Usage

#### Web library
For import into react project or other website.
In your project directory simply run: 
`npm install tidyscripts_web`



#### Node library
For import by node process.
In your project directory simply run: 
`npm install tidyscripts_node`

## Local Development


### Generate docs
``` npx typedoc ```

### Build packages 
``` npm run build ```

### Sync git repository
``` ./bin/sync COMMIT_MSG ``` 

## Contact - 
Twitter - @shayaluko\
Instagram - @sheunaluko\
Linked In - sheun-aluko


