var util = require("util");
var express = require("express");
var fs = require("fs");
var bodyParser = require('body-parser');
var app = express();

var port = 8080;

var request = require("request");

if (!fs.existsSync("sets.json"))
{
  fs.writeFileSync("sets.json", JSON.stringify([]));
}

app.listen(port, function() {
  console.log("Now listening on port " + port + "!");
});

app.use(express.static(__dirname + '/public'));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//app.get("/getitem/ebay/:itemid", getItem);

app.get("/getsets", function(req, res) {
  console.log("/getsets " + JSON.stringify(req.body));
  var resp = {
    status: "ok",
    sets: JSON.parse(fs.readFileSync("sets.json"))
  };
  res.send(resp);
  console.log("response: " + JSON.stringify(resp));
});

app.post("/saveset", function(req, res) {
  console.log("/saveset " + JSON.stringify(req.body));
  if (check_structure(req.body, res, ["setname"]))
  {
    var resp = {
      status: "ok",
      notvalid: [],
    };

    var file = JSON.parse(fs.readFileSync("sets.json"));

    var tmp = {
      name: req.body.setname,
      items: [],
      custom: []
    };

    if (req.body.items)
    {
      tmp.items = req.body.items;
    }
    if (req.body.custom)
    {
      tmp.custom = req.body.custom;
    }

    var found = false
    for (var i = 0; i < file.length; i++) {
      if (file[i].name == tmp.name)
      {
        file[i].items = tmp.items;
        file[i].custom = tmp.custom;
        found = true;
        break;
      }
    }
    if (!found)
    {
      file.push(tmp);
    }

    fs.writeFileSync("sets.json", JSON.stringify(file));

    res.send(resp);
    console.log("response: " + JSON.stringify(resp));
  }
  else
  {
    send_fail(res, "items not valid");
  }
});

function send_fail(res, msg)
{
  res.send({
    status: "fail",
    msg: msg
  });
  console.log("error: " + msg);
}

function check_structure(body, res, struct)
{
  if (!defined_structure(body, struct))
  {
    send_fail(res, "body not valid");
    return false;
  }
  return true;
}

function defined_structure(obj, attrs)
{
    for (i = 0; i < attrs.length; i++)
    {
      if (!obj.hasOwnProperty(attrs[i]))
        return false;
    }
    return true;
}
