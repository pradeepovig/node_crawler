const rp = require('request-promise');
const cheerio = require('cheerio');
let website = 'https://ianlunn.co.uk'; // Hard coded for now
let keyword = 'Ian';
let totalPagesCrawled = 0;
let pagesWithKeyword = 0;
const urlHistory = [website]; // Dynamically growing crawled URL history
const results = {}; // Store the output of a successful find in a neat format
let linksStack= [];
// let totalLinks= 0;

/*Scope for dynamic user inputs later*/
function takeInputFromUser() {
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    })

    readline.question(`Enter website followed by keyword?`, input => {
        if (input && input.length) {
            const inputArr = input.split(' ');
            website = inputArr[0];
            keyword = inputArr[1];
        }
        readline.close();
    })
}

function printResults() {
    console.log(`Crawled ${totalPagesCrawled} pages. Found ${pagesWithKeyword} pages with the term ${keyword}`);

    // Spit out the page uri with 3 words at a minimum and keyword included
    if (Object.keys(results).length) {
        for (const key in results) {
            console.log(`${key} => ${results[key]}`);
        }
    }
}

function getFullRelativeURLFromLink(link) {
    if (!link.includes('http')) { // Checking relative link only
        if (link.startsWith('/')) {
            return link === '/' ? '' : `${website}${link}`;
        } else {
            return `${website}/${link}`;
        }
    } else {
        return '';
    }
}

/*Spits out at least 1 word surrounding the searched keyword on
either side from text.

e.g Word1 {keyword} Word2*/
function getNearbyWordsFromKeywordText(keyword, keywordText) {
    const regex = new RegExp(`(\\S+)\\s*${keyword}\\s*(\\S+)`, 'g');
    let m  = regex.exec(keywordText);
    return m ? m[0] : null;
}

function findKeywordWithinBody(keyword, body = []) {
    let output;

    for(let i = 0; i < body.length; i++) {
        if (body[i].includes(keyword)) {
            output = getNearbyWordsFromKeywordText(keyword, body[i]);
            break;
        }
    }

    return output;
}

/*TODO:
*  1. Detect the end of recursive function and then print results.
*  2. Debug the depth = 2 feature.
*  3. Try out better libraries for crawling or rewrite with async await.
*  4. Debug parsing HTML strings
*/
function crawl(url, keyword, depthCounter = 0) {
    rp(url)
        .then(res => {
            totalPagesCrawled++;
            urlHistory[url] = true;

            // Initializing body
            const $ = cheerio.load(res); // Our HTML Doc

            // Printing out the results from current page's body
            const body = $('body').text().replace(/^(?=\n)$|^\s*|\s*$|\n\n+/gm,"").split('\n'); // Split entire body text by new line
            let keywordInBody = findKeywordWithinBody(keyword, body);

            if (keywordInBody) {
                pagesWithKeyword++;
                results[url] = keywordInBody;
            }

            // Finding links and crawling over them recursively for depth upto 2
            const links = $('a').map((i, link) => link.attribs.href).get();
            const relativeLinks = links.filter(link => !link.includes('http') && link !== '/').map(filteredLink => getFullRelativeURLFromLink(filteredLink));

            linksStack = [...linksStack, ...relativeLinks];

            if (linksStack.length && depthCounter <= 2) {
                depthCounter++;

                // linksStack.forEach(link => {
                //     totalLinks--;
                //
                //     if (urlHistory.indexOf(link) === -1) {
                //         urlHistory.push(link);
                //         crawl(link, keyword, depthCounter);
                //     }
                // });

                let link;
                while(link = linksStack.pop()) {
                    if (urlHistory.indexOf(link) === -1) {
                        urlHistory.push(link);
                        crawl(link, keyword, depthCounter);
                    }
                }
            } else {
                depthCounter = 0;
            }

            if (!linksStack.length) {
                printResults();
            }
        })
        .catch(function (err) {
            console.log('Crawl Error \n');
            console.log(err);
        });
}

crawl(website, keyword, 0);
