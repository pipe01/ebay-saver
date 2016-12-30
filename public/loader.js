var x2js = new X2JS();

var currentset = "";
var sets = [];

function save()
{
  var i = set(currentset);
  var send = {
    setname: currentset,
    items: [],
    custom: []
  };

  if (i != undefined)
  {
    send.items = set().items;
    send.custom = set().custom;
  }
  console.log(send);
  $.post("/saveset", send, function() {
    loadSets();
    loadItems();
  });
}

function loadSets()
{
  $.get("/getsets", {}, function (data, status, _) {
    sets = data.sets;
    console.log(sets);

    $("#loadSet").html("");
    for (var i = 0; i < sets.length; i++) {
      $("#loadSet").append($("<option>", {text:sets[i].name}));
    }

  });
}

function set(name)
{
  if (!name)
  {
    return sets[set(currentset)];
  }
  else
  {
    for (var i = 0; i < sets.length; i++) {
      if (sets[i].name == name)
      {
        return i;
      }
    }
    return undefined;
  }
}

var items;

function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false );
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function loadItems(callback)
{
  if (currentset == "" || set() == undefined)
  {
    return;
  }

  loadStart();

  var listelement = document.getElementById("itemlist");
  items = {};

  var curset = set();

  while (listelement.firstChild) {
    listelement.removeChild(listelement.firstChild);
  }

  var listelement = document.getElementById("itemlist");
  for (var i = 0; i < set().custom.length; i++) {
    var itm = set().custom[i];

    listelement.appendChild(createFromTemplate(itm, true));
  }

  if (curset.items.length == 0)
  {
    updateTotal();
    loadEnd();
    return;
  }

  var loaded = 0;

  for (var i = 0; i < curset.items.length; i++) {
    var citem = curset.items[i];
    var url = "http://cors-anywhere.herokuapp.com/http://open.api.ebay.com/shopping?callname=GetSingleItem&appid=PipePi-GoogleSp-PRD-f57734100-630ddbe6&version=713&ItemID=" + citem.id + "&siteid=186";

    $.ajax({
      url: url,
      dataType: 'text',
      success: function(resp) {
        var data = x2js.xml_str2json(resp);

        if (data.GetSingleItemResponse.Ack == "Failure")
        {
          alert("Error mientras se cargaban items:\n\n" + data.GetSingleItemResponse.Errors.LongMessage);
          loadEnd();
          return;
        }

        loaded++;

        var item = data.GetSingleItemResponse.Item;
        var thisid = Number(item.ItemID);

        var index = -1;
        for (var i = 0; i < curset.items.length; i++) {
          if (curset.items[i].id == thisid)
          {
            index = i;
          }
        }

        var price = Number(item.ConvertedCurrentPrice.__text);
        var currency = item.ConvertedCurrentPrice._currencyID;
        item.Price = {
          Amount: price,
          Currency: currency
        };
        item.Amount = curset.items[index].amount;
        items[thisid] = item;

        if (loaded == curset.items.length)
        {
          updateTotal();
          loadEnd();
          for (var key in items) {
            if (items.hasOwnProperty(key)) {
              var item = items[key];

              listelement.appendChild(createFromTemplate(item));
            }
          }
          if (callback)
          {
            callback();
          }
        }
      }
    });
  }
}

function createFromTemplate(data,c)
{
  var templ = document.getElementById("item-template").content.cloneNode(true);

  if (!c)
  {
    templ.querySelector(".pic").src = data.PictureURL;
    templ.querySelector(".title").innerHTML = data.Title;
    templ.querySelector(".title").href = "http://www.ebay.es/itm/" + data.ItemID;
    templ.querySelector(".price").innerHTML = data.Price.Amount + " " + data.Price.Currency;
    templ.querySelector(".amount").innerHTML = "x" + data.Amount;
    templ.firstElementChild.id = data.ItemID;
  }
  else
  {
    templ.querySelector(".pic").src = data.pic;
    templ.querySelector(".pic").onclick = function(){
      var input = prompt("URL de la imagen", "http://");
      if (prompt != "")
      {
        this.src = input;
        for (var i = 0; i < set().custom.length; i++) {
          console.log(set().custom[i].id);
          console.log(this.parentElement.id);
          if (set().custom[i].id == this.parentElement.id)
          {
            set().custom[i].pic = input;
            save();
          }
        }
      }
    };
    templ.querySelector(".title").innerHTML = data.title;
    templ.querySelector(".title").href = data.link;
    templ.querySelector(".price").innerHTML = data.price + " " + data.currency;
    templ.querySelector(".amount").innerHTML = "x" + data.amount;
    templ.firstElementChild.id = data.id;
    templ.firstElementChild.setAttribute("custom", "");
  }

  return templ;
}

function addItem(a, refresh)
{
  if (typeof(a) == "object")
  {
    var i = -1;
    var loop = function() {
      i++;
      if (i == a.length) //finished loop
      {
        loadItems();
        return;
      }
      addItem(a[i], false, loop);
    }
    loop();
  }
  else if (typeof(a) == "number")
  {
    var i = set(currentset);
    var index = indexOf_complex(sets[i].items, "id", a);
    if (index != undefined)
    {
      sets[i].items[index].amount++;
    }
    else
    {
      sets[i].items.push({
        id: a,
        amount: 1
      });
    }
    save();
  }
  updateTotal();
}

function addCustomItem(title, amount, price, cur, link)
{
  var lnk = link ? link : prompt("URL del item", "http://");
  if (!(lnk.startsWith("http://") || lnk.startsWith("https://")))
  {
    lnk = "http://" + lnk;
  }
  set().custom.push({
    title: title,
    amount: amount,
    price: price,
    currency: cur,
    link: lnk,
    id: Math.floor(Math.random() * 1000000),
    pic: ""
  });
  save();
}

function removeCustomItem(id)
{
  for (var i = 0; i < set().custom.length; i++) {
    if (set().custom[i].id == id)
    {
      if (set().custom[i].amount > 1)
      {
        set().custom[i].amount--;
      }
      else
      {
        set().custom.splice(i);
      }
      save();
      break;
    }
  }
}

function removeItem(itemid)
{
  var index = indexOf_complex(set().items, "id", itemid);
  if (index > -1)
  {
    if (set().items[index].amount > 1)
    {
      set().items[index].amount--;
    }
    else
    {
      set().items.splice(index, 1);
    }
  }
  save();
}

function updateTotal()
{
  var total = 0;
  var custs = set().custom;

  console.log("update total");

  for (var i = 0; i < set().items.length; i++) {
    console.log(set().items[i]);
    var id = set().items[i].id;
    total += items[id].Price.Amount * items[id].Amount;
  }

  for (var i = 0; i < custs.length; i++) {
    total += custs[i].price * custs[i].amount;
  }

  $("#total").html("Total: " + total.toFixed(2) + " EUR");
}

function loadStart()
{
  $("#loading").removeClass("hide");
  $("#btnload").prop('disabled', true);
  $(".silk").removeAttr("closing");
}

function loadEnd()
{
  $("#loading").addClass("hide");
  $("#btnload").prop('disabled', false);
  $(".silk").attr("closing", "");
}

window.onload = function() {
  loadSets();
  loadItems();
  loadEnd();
  $("#loadSet").select(function() {
    $("#setname").val($("#loadSet").val());
  });

  $("#btnsave").click(function() {
    var sel = $("#setname").val();
    console.log(sel);
    currentset = sel;
    save();
  });

  //addItem([322010322862, 322110435679]);
};


function getItemID(url)
{
  if (url)
  {
    if (!isNaN(url)) //get NaN from number("pene")
    {
      return Number(url);
    }
    else
    {
      var id = /\/\d+/.exec(url);
      if (id)
      {
        return Number(id[0].substr(1));
      }
    }
    return undefined;
  }
}
getItemID();

function btnAdd()
{
  var ret = getItemID($('#url').val());
  addItem(ret, true);
  $('#url').val("");
}

function btnDupe(t)
{
  var gparent = t.parentElement.parentElement;
  var id = gparent.id;
  if (gparent.hasAttribute("custom"))
  {
    for (var i = 0; i < set().custom.length; i++) {
      if (set().custom[i].id == id)
      {
        set().custom[i].amount++;
        save();
        break;
      }
    }
  }
  else
  {
    addItem(Number(t.parentElement.parentElement.id), true)
  }
}

function btnRemove(t)
{
  var gparent = t.parentElement.parentElement;
  var id = gparent.id;
  if (gparent.hasAttribute("custom"))
  {
    removeCustomItem(id);
  }
  else
  {
    removeItem(id);
  }
}

function btnCustom()
{
  var title = $("#cname").val();
  var price = Number($("#cprice").val());
  var link = $("#clink").val();
  addCustomItem(title, 1, price, "EUR", link);
  $("#cname").val("");
  $("#cprice").val("");
  $("#clink").val("");
}

function indexOf_complex(arr, prop, val)
{
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][prop] == val)
    {
      return i;
    }
  }
  return undefined;
}
