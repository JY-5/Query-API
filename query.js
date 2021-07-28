const fetch = require('node-fetch')

const sortByValues = new Set(['id', 'reads', 'likes', 'popularity']);
const directionValues = new Set(['desc', 'asc']);
// Cache queries
const LRU = require("lru-cache")
  , options = { max: 500
              , length: function (n, key) { return n * 2 + key.length }
              , dispose: function (key, n) { n.close() }
              , maxAge: 1000 * 60 * 60 }
  , cache = new LRU(options)
  , otherCache = new LRU(50)

const ifTagsStringsEmpty = (tagsParsed) => {
    for (let tag of tagsParsed) {
        if (!tag) {
            return true;
        }
    }
    return false;
}

const ifSortByValid = (sortBy) => {
    if (sortByValues.has(sortBy)) {
        return true;
    }
    return false;
}

const ifDirectionValid = (direction) => {
    if (directionValues.has(direction)) {
        return true;
    } else {
        return false;
    }
}

const getData = (url) => {
    const cacheData = cache.get(url);
    // If we have cached this query
    if (cacheData) {
        return Promise.resolve(JSON.parse(cacheData));
    }
    
    // If we have not cached this query
    return fetch(`${url}`,  {
            method: 'GET',
        })
        .catch( () => Promise.reject({ error: 'network-error'} ) )
        .then( response => {
            if(response.ok) {
                return response.json().then( json => {
                    cache.set(url, JSON.stringify(json));
                    return Promise.resolve(json);
                });
            }
            return response.json().then( json => Promise.reject(json) );
        });
}

const query = {
    ifTagsStringsEmpty,
    ifSortByValid,
    ifDirectionValid,
    getData,
    cache
}

module.exports = query;