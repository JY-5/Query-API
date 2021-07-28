const express = require("express");
const query = require("./query");
const app = express();

app.get("/api/ping", (req, res) => {
    res.status(200).json({ "success": true });
});

app.get("/api/posts", (req, res, next) => {
    const tags = req.query.tags;
    const sortBy = req.query.sortBy;
    const direction = req.query.direction;
    
    // Check if tags parameter is empty
    if (!tags) {
        res.status(400).json({ "error":"Tags parameter is required" });
        return;
    } 

    // Check if each tag is an empty string
    const tagsParsed = tags.split(",");
    if (query.ifTagsStringsEmpty(tagsParsed)) {
        res.status(400).json({ "error":"Tags parameter is required" });
        return;
    }

    // Check if sortBy parameter is valid
    if (sortBy && !query.ifSortByValid(sortBy)) {
        res.status(400).json({ "error":"sortBy parameter is invalid" });
        return;
    } 

    // Check if direction parameter is valid
    if (direction && !query.ifDirectionValid(direction)) {
        res.status(400).json({ "error":"direction parameter is invalid" });
        return;
    }

    // Preprocessed to allow concurrent requests
    const queries = [];
    const tagsSet = new Set(); // Deduplicate the same tags
    for (let i = 0; i < tagsParsed.length; i++) {
        if (!tagsSet.has(tagsParsed[i])) {
            url = `https://api.hatchways.io/assessment/blog/posts?tag=${tagsParsed[i]}`;
            queries.push(query.getData(url));
            tagsSet.add(tagsParsed[i]);
        }
    }

    // Custom array comparator
    const postComparator = function(post1, post2) {
        let queriesSort = 'id';
        let queriesDirection = 'asc';
        if (sortBy) {
            queriesSort = sortBy;
        }

        if (direction) {
            queriesDirection = direction;
        }

        if (queriesDirection === 'asc') {
            return post1[queriesSort] - post2[queriesSort];
        } else {
            return post2[queriesSort] - post1[queriesSort];
        }
    }

    // Concurrent requests
    Promise.all(queries)
    .then( (queriesResults) => {
        const postsMap = new Map();
        queriesResults.map((queryResult) => {
            for (let post of queryResult['posts']) {
                const value = postsMap.get(post['id']);
                if (!value) {
                    postsMap.set(post['id'], post);
                }
            }
        })

        // Sort it according to sortBy and direction parameters
        const sortedPosts = Array.from(postsMap.values()).sort(postComparator);

        res.status(200).json({ 'posts' : sortedPosts });
        return;
    })
    .catch( (err) => {
        res.status(400).json({ "error": err });
        return;
    });
});

module.exports = app;

app.listen(3000, () => {
 console.log("Server running on port 3000");
});
