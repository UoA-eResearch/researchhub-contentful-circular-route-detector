# researchhub-contentful-circular-route-detector
* AWS Serverless (Lambda) function that detects circular routes within the ResearchHub Contentful entries.
* Acts as a backup check if the Contentful extension app (subhub-link-checker) fails to detect a circular route. Logs from this lambda are used to generate alerts in Grafana which will notify the dev team.
* Built using the [Serverless Framework](https://serverless.com/)

## Setup
1. Install [Serverless Framework](https://www.serverless.com/) globally
```
npm install -g serverless
```
2. Install `NPM` modules
```
npm install
```
3. Obtain Temporary AWS credentials for UoA (**Note:** only valid for 1 hour):
Running and testing locally will not succeed without AWS credentials. Instructions for accessing the credentials are on the [Auckland Uni wiki](https://wiki.auckland.ac.nz/pages/viewpage.action?spaceKey=UC&title=AWS+Temporary+Credentials+for+CLI).

* Generated credentials are located in ~/.aws/credentials. Take note of the profile name for the credentials. Currently "saml" is the default profile at the time of writing this.
* Passing in the aws credentials to the deploy and test commands can be done by adding arguments after a double dash to the run/test commands. This applies to any npm command.
e.g.
* Deploying with the default dev stage and saml profile:
`npm run deploy -- --aws-profile saml`

## Run locally
To run locally simply execute:
```
npm start -- --aws-profile <profile> --stage <stage>
```

## Deploy to AWS
To deploy to AWS execute:
* By default it deploys to the `dev` stage if you don't provide a stage parameter
```
npm deploy -- --aws-profile <profile> --stage <stage>
```

## Get info about existing deployment
To get information about the currently deployed endpoints, region, stage, layers and other things, execute:

```
sls info
```

For info on a specific stage, and AWS account profile, use the profile and stage flags. e.g.:

```
sls info --stage test --aws-profile uoa-its-nonprod
```

## Invoke a deployed Lambda function running on AWS

```
sls invoke -f contentful-circular-route-detector
```

## Resources
* For general Serverless Framework help run: `sls help`
* [Serverless Mocha Plugin](https://www.npmjs.com/package/serverless-mocha-plugin)