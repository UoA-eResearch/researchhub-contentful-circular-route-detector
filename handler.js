const https = require('https');

const defaultOptions = {
    host: 'rhubcpapi.sandbox.amazon.auckland.ac.nz',
    port: 443, // or 443 for https
    headers: {
        'Content-Type': 'application/json',
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

exports.handler = async(event) => {
    // TODO implement
    const response = await getDuplicates();
    return response;
};

let getDuplicates = async() => {

    let res = await post("/", { query: `
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

    let responseMsg = "";
    let statusCode;

    if (duplicates.length) {
        statusCode = 500;
        responseMsg = " <b style='color: red'>WARNING:</b> Circular SubHub child page structures detected <br /><br />"
        duplicates.forEach(duplicate => {
            responseMsg = responseMsg + `The <i>${duplicate.type}</i> page: <pre>${duplicate.slug}</pre> has multiple <i>SubHub</i> parents: <pre>${duplicate.parentSubHubs.join(', ')}</pre><br />`
        });
        responseMsg += `<br/><img src="https://i.giphy.com/media/bcrOR2stk6tKIxqPOZ/giphy.webp" width="300px" frameBorder="0"></img>`;
    }
    else {
        statusCode = 200;
        responseMsg = `
        No circular SubHub child page structures detected
        <br /><br /><br />
        <img src="https://i.giphy.com/media/xSM46ernAUN3y/giphy.webp" width="200px" frameBorder="0"></img>
        `;
    }

    return {
        statusCode: statusCode,
        body: `<center>
        <h1>ResearchHub Circular SubHub Detector</h1>
        <hr />
         ${responseMsg}
        </center>`,
        "headers": {
            'Content-Type': 'text/html',
         }
    };
};
