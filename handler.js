const https = require('https');

let defaultOptions = {
    host: 'rhubcpapi-dev.connect.test.amazon.auckland.ac.nz',
    port: 443,
    headers: {
        'Content-Type': 'application/json',
    }
}

const post = (path, payload) => new Promise((resolve, reject) => {
    console.log(JSON.stringify(defaultOptions));
    const options = { ...defaultOptions, path, method: 'POST' };
    const req = https.request(options, res => {
        let buffer = "";
        res.on('data', chunk => buffer += chunk)
        res.on('end', () => resolve(JSON.parse(buffer)))
    });
    req.on('error', e => reject(e.message));
    req.write(JSON.stringify(payload));
    req.end();
})

exports.main = async(event) => {
    // set the correct graphql server domain. We can use dev, test or prod server to test
    // the corresponding contentful environments. Default is dev.
    if (event.hasOwnProperty('httpMethod') && event.httpMethod === "GET") {
        // the lambda was invoked via api gateway
        if (event.pathParameters !== null) {
            defaultOptions.host = event.pathParameters.graphqlserverdomain;
        }
    } else {
        // the lambda was probably invoked by scheduled event
        console.log(event.graphqlServerDomain);
        defaultOptions.host = event.graphqlServerDomain;
    }

    const response = await getDuplicates();
    return response;
};

let getDuplicates = async() => {

    let res = await post('/cer-graphql-service/', { query: `
    {
      subHubCollection {
        items {
          slug
          internalPagesCollection {
            items  {
              ...on Article {
                slug
                __typename
              }
              ...on Equipment {
                slug
                __typename
              }
              ...on Service {
                slug
                __typename
              }
              ...on SubHub {
                slug
                __typename
              }
            }
          }
        }
      }
    }
    ` });

    res = res.data.subHubCollection.items;

    let childPages = [];
    res.forEach(subHub => {
        subHub.internalPagesCollection.items.forEach(childPage => {
            childPages[childPage.slug] = {
                slug: childPage.slug,
                type: childPage.__typename,
                parentSubHubs: !!childPages[childPage.slug] && childPages[childPage.slug].type == childPage.__typename ? [...childPages[childPage.slug]['parentSubHubs'], subHub.slug] : [subHub.slug]
            };
        })
    });

    let duplicates = []
    for (childPage in childPages) {
        if (childPages[childPage].parentSubHubs.length > 1) {
            duplicates.push(childPages[childPage]);
        }
    }

    let responseMsg = '';
    let statusCode;

    if (duplicates.length) {
        statusCode = 500;
        responseMsg = 'WARNING: Circular SubHub child page structures detected. \n';
        duplicates.forEach(duplicate => {
            responseMsg = responseMsg + `The ${duplicate.type} page: ${duplicate.slug} has multiple SubHub parents: ${duplicate.parentSubHubs.join(', ')}. \n`
        });
    }
    else {
        statusCode = 200;
        responseMsg = 'No circular SubHub child page structures detected';
    }

    console.log(responseMsg);

    return {
        statusCode: statusCode,
        body: responseMsg,
        headers: {
          'Content-Type': 'application/json',
        }
    };
};
