function htmltab(x,_y){
  document.write("<table border=1>")
  document.write("<tr>")
  _y.head.map(x=>document.write("<th>"+x+"</th>"))
  document.write("</tr>")
  x.map(r=>{
  document.write("<tr>")
  r.map(c=>{
  document.write("<td>")
  document.write(c);
  document.write("</td>")
  })
  document.write("</tr>")
  })
  document.write("</table>")
}

function lg(x){
  document.write(JSON.stringify(x))
  document.write("<br/>")
}


function draw(e,html){
  let li = document.createElement("LI");  
  var textnode = document.createTextNode("cls="+JSON.stringify(e.cls)); 
  //li.appendChild(textnode);  
  html.appendChild(li)
  if(e.L){
  let li1= document.createElement("LI");  
  html.appendChild(li1)
  li1.appendChild(document.createTextNode("L("+"x["+e.f+"]<"+e.v.toFixed(2)+")"+JSON.stringify(e.L.cls)));  
  let ol1 = document.createElement("ul");  
  li1.appendChild(ol1)
  draw(e.L,ol1)
  }
  if(e.R){
  let li1= document.createElement("LI");  
  html.appendChild(li1)
  li1.appendChild(document.createTextNode("R("+"x["+e.f+"]>="+e.v.toFixed(2)+")"+JSON.stringify(e.R.cls)));  
  let ol1 = document.createElement("ul");  
  li1.appendChild(ol1)
  draw(e.R,ol1)
  }
}

function fixlast() {
  var tree = document.getElementById("root");
  var lists = [ tree ];
 
  for (var i = 0; i < tree.getElementsByTagName("ul").length; i++)
    lists[lists.length] = tree.getElementsByTagName("ul")[i];

  for (var i = 0; i < lists.length; i++) {
    var item = lists[i].lastChild;
   
    while (!item.tagName || item.tagName.toLowerCase() != "li")
    item = item.previousSibling;

    item.className += " last";
  }
};