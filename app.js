const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

app.use("/icons", express.static(__dirname + "/icons"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/css", express.static(__dirname + "/css"));

app.all("/*", function(req, res, next) {
    res.sendFile("index.html", {
        root: __dirname
    });
});

app.listen(port);
