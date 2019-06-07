var fs = require('fs')
var f='play.csv'

var data = []
var features = []
var cat2id = []
var id2cat = []
var classid = 4
var dropheader = true

var rid=0;
fs.readFile(f,'utf8', function(e,c){
   data = c.split('\r')
   for(var i=0;i<data.length;i++){
       data[i] = data[i].replace('\n','').split(',');
   }
   if(dropheader)data.splice(0,1);
   dataloaded()
})

function mlen(m){
   return Object.keys(m).length
}

function colstats(num){
   var map = {}
   var uniqid = 1;
   var m ={}
   var rm = {}
   for(var i = 0;i < data.length; i++){
      if(map[data[i][num]])map[data[i][num]]++
      else map[data[i][num]]=1

      if(!m[data[i][num]]){
          m[data[i][num]] = uniqid
          rm[uniqid] = data[i][num]
          uniqid++
      }
   }
   cat2id.push(m)
   id2cat.push(rm)
   //console.log(map)
   return map;
}

function sum(map){
   var k = Object.keys(map);
   var s = 0;
   for(var i=0;i<k.length;i++){
      s+=map[k[i]]
   }
   return s;
}

function div(map,c){
   var k = Object.keys(map);
   var s = 0;
   for(var i=0;i<k.length;i++){
      map[k[i]]/=c
   }
   return map;
}

function entropy(bucket){
   var map = {}
   for(var i = 0; i < bucket.length; i++){
       if(map[bucket[i][classid]])map[bucket[i][classid]]++
       else map[bucket[i][classid]]=1
   }
   //console.log(map)
   var s = sum(map)
   div(map,s)
   //console.log(map)
   var k = Object.keys(map);
   var s = 0;
   for(var i=0;i<k.length;i++){
      var p = map[k[i]]
      s += p*Math.log(p)
   }
   //console.log(s)
   return -s;
}


function bestsplit(bucket,colid){
   var best={left:[], right:[]}
   var be = -1.0
   var e = entropy(bucket)
   for(var j =0; j < mlen(cat2id[colid]); j++){
      var t = cat2id[colid]
      var left = []
      var right = []
      for(var i = 0; i < bucket.length; i++){
          //console.log(cat2id[colid][bucket[i][colid]] + ' ' + j)
          if(cat2id[colid][bucket[i][colid]] == (j+1)) left.push(bucket[i])
          else right.push(bucket[i])
      }
      if(left.length == 0) continue;
      if(right.length == 0) continue;
      //console.log('analysis ' + j)
      
      var e1 = entropy(left)
      var e2 = entropy(right)
	  var gain = (e - e1*left.length/bucket.length - e2*right.length/bucket.length)
      if(gain > be){
         be = gain
         best['left']=left
         best['right']=right
         best['entropy'] = be
         best['split'] = { col:colid, val: j, lab: id2cat[colid][j+1], entropy: e, gain: be}
         //console.log('impr ' + gain)
      }      
   }
   return best
}

function thebestsplit(x){
   var tb = null
   for(var i = 0; i < data[0].length-1; i++){
       var g = bestsplit(x,i)
       if(!tb || g.entropy < tb.entropy){
           tb = g
       }
   }
   return tb
}

function buildtree(x, lvl){
   var queue = [] 
   var root = {}
   console.log('start')
    
   queue.push({data:x, node:root})
  
   while(queue.length > 0){
      var d = queue.pop()
      var n = thebestsplit(d.data)
      d.node['split'] = n['split']
      d.node['L'] = {}
      d.node['R'] = {}
      
    
      if(n.split)console.log(n.split)
      else console.log("leaf")
      console.log(d.data)


      if(n.left.length >0){
        queue.push({data:n.left, node: d.node['L']})
      }

      if(n.right.length >0){
         queue.push({data:n.right, node: d.node['R']})
      }
   }
   console.log('done')
   return root
}

function classify(x, tree){
   var n=tree
   while(true){
       
       var sp = n.split
       var val = cat2id[sp.colid][x[sp.colid]]
       if(val <= sp.val) n = n.L
       else n = m.R
   }
}


function dataloaded(){
   console.log('loaded')
   for(var i = 0; i < data[0].length; i++){
       features.push(colstats(i))
   } 
   console.log(features)
   console.log(cat2id)
   console.log("===========")
   buildtree(data, 5)
}
