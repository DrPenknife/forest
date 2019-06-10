var fs = require('fs')
var f='tennis.csv'

var dropheader = true
var data = []
var classid = -1
var header = null
var colstats = []
var entropy0 = -1

function randint(min, max){
	return Math.floor((max-min)*Math.random()+min)
}

function entropy(prob){
	var denom = 0;
    var sum = 0;
    for(var key in prob){
        denom += prob[key]
    }
    for(var key in prob){
        var p = prob[key]/denom
        sum += p*Math.log(p)
    }
    return -sum;
}

function split_col(x, colid, val, e0){
    //console.log('split ' + colid + ' on ' + val)
    var mp = [[],[]]
    var stat = [{},{}]
    var ln = [0,0]
    var L = x.length
    for(var i in x){
        var l = x[i][classid] 
        var hit=0
        if(x[i][colid] == val)hit=1
        ln[hit]++;
        stat[hit][l] = stat[hit][l]?stat[hit][l]+1:1
        mp[hit].push(x[i]) 
    }
    //console.log(stat)
    var res={split:mp, stats:stat, ln:ln}
    
    //console.log( [entropy(stat[0]), entropy(stat[1])] );
    if(ln[0] && ln[1]){
        res.gain = e0 
	               - entropy(stat[0])*ln[0]/L
                   - entropy(stat[1])*ln[1]/L
        return res
    }else return null
}


function randomsplit(node){
    var col = randint(0, node.data[0].length)
    var sampleid = randint(0, node.data.length)
    var value = node.data[sampleid][col]
    var r = split_col(node.data, col, value, node.entropy)
    return r
}

function split(node){
    var best = null
    for(var i=0;i<5;i++){
       var r = randomsplit(node)
       if(!best || node.gain > best.gain){
           best = node
       }
    } 
    console.log(best)
    return best;
}

function buildtree(data, maxdepth){
    console.log('build tree')
    var q = [{data:data, depth:maxdepth, entropy: entropy0}]
    while(q.length){
        var parent = q.pop()
        var children = split(parent)
		if(children){
			if(children.L)q.push(children.L)
            else q.push(children.R)
        }else{
            parent['isleaf']=true
		}
    }
}

function calcstats(){
    colstats = []
    for(var j=0; j<data[0].length; j++){
        var stat = {}
		for(var i in data){
            var l = data[i][j]
            stat[l]=stat[l]?stat[l]+1:1;
        }
        colstats.push(stat);
    }
}

function alldone(){
   console.log('header')
   console.log(header)
   console.log(colstats)
   console.log('=-=-=-=-=-=-=-=-=-')
   console.log(data)
   console.log('entropy=' + entropy0);
   console.log('=-=-=-=-=-=-=-=-=-')

   buildtree(data, 5)
}

// -=-=-=-=-=-=-=-=-=-

fs.readFile(f,'utf8', function(e,c){
   data = c.split('\n')
   for(var i=0;i<data.length;i++){
       data[i] = data[i].replace('\n','').split(',');
   }
   if(dropheader)header = data.splice(0,1)[0];
   classid = data[0].length - 1;
   calcstats()
   entropy0 = entropy(colstats[classid]);
   alldone()
})


