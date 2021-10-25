const https = require('https');

let defaultOptions = {
    host: '',
    port: 443,
    headers: {
        'Content-Type': 'application/json',
        // to test the preview api (locally) change the url to /cer-graphql-preview-service/ and add auth token here e.g.:
        // 'authorization': `Bearer <TOKEN>`
    }
}

const post = (path, payload) => new Promise((resolve, reject) => {
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
        defaultOptions.host = event.graphqlServerDomain;
    }

    console.log('Target API: ' + defaultOptions.host);

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

    let responseMsg = '';

    if (res.hasOwnProperty('errors')) {
        res.errors.forEach(err => {
            try {
                if (err.message.includes('Did not fetch typename for object')) {
                    responseMsg = responseMsg + `WARNING: Typename error encountered. Page slug: ${res.data.subHubCollection.items[err.path[2]].slug} \n`;
                }
            } catch (e) {
                console.log(e);
            }
        })
    }
    res = res.data.subHubCollection.items;

    let childPages = [];
    res.forEach(subHub => {
        // Remove nulls in case of typename error.
        subHub.internalPagesCollection.items = subHub.internalPagesCollection.items.filter(item => item);
        
        subHub.internalPagesCollection.items.forEach(childPage => {
            // if no typename property, then ignore those ones. They may be draft content that is linked to within the page.
            if (childPage.hasOwnProperty('__typename')) {
                childPages[childPage.slug] = {
                    slug: childPage.slug,
                    type: childPage.__typename,
                    parentSubHubs: !!childPages[childPage.slug] && childPages[childPage.slug].type == childPage.__typename ? [...childPages[childPage.slug]['parentSubHubs'], subHub.slug] : [subHub.slug]
                };
            }
        })
    });

    let duplicates = []
    for (childPage in childPages) {
        if (childPages[childPage].parentSubHubs.length > 1) {
            duplicates.push(childPages[childPage]);
        }
    }

    let statusCode;

    if (duplicates.length) {
        statusCode = 500;
        responseMsg = responseMsg + 'WARNING: Circular SubHub child page structures detected. \n';
        duplicates.forEach(duplicate => {
            responseMsg = responseMsg + `The ${duplicate.type} page: ${duplicate.slug} has multiple SubHub parents: ${duplicate.parentSubHubs.join(', ')}. \n`
        });
    }
    else {
        statusCode = 200;
        responseMsg = responseMsg + 'No circular SubHub child page structures detected';
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
