
console.log("starting...")

_data=iris.slice(1)
//_data=netflow.slice(1).map(x=>x.slice(0,8))
let echo=(x)=>document.write(x)

let _y={}
_y.hist = _data.map(x=>x[x.length-1]).reduce((a,b)=>(a[b]=++a[b]||1,a),{})
_y.total = 0
_y.map = Object.keys(_y.hist).reduce((prev,act)=>(prev[act]=_y.total++,prev),{})
_y.head=_data[0]
_c = _y.head.length-1
_data.map(r=>r[_c]=_y.map[r[_c]])

console.log("data loaded...")
console.log("class dist.", _y.hist)

let _rep=(n,val)=>("+".repeat(n).split("").map(x=>val||0))
let _zct=()=>_rep(_y.total)
let _sum=(a,b)=>a+b
let _rint=(min,max)=>Math.floor((max-min)*Math.random()+min)
let _getcls=(dat)=>dat.map(x=>x[_c])
let _acc = (p,a)=>(p[a]=++p[a]||1,p)
let _ctcls=(dat)=>_getcls(dat).reduce(_acc,_zct())
let _impur_b=(t,s)=>(1 - t.map(v=>v*v/s/s).reduce(_sum))
let _impur=(dat)=>_impur_b(_ctcls(dat),dat.length)


function scan(i0,d,colid){
  var nbin=Math.min(d.length,10)
  var bi = _rep(nbin).reduce((p,c)=>(p.push(_zct()),p),[])
  var mm=[d[0][colid],d[0][colid]]
  var cls =_zct()
  d.map((r)=>{
    mm[0]=Math.min(mm[0],r[colid])
    mm[1]=Math.max(mm[1],r[colid])
    cls[r[_c]]++
  })
  let best={g:-1}
  if(mm[0]==mm[1])return best;
  let denom=mm[1]-mm[0]+0.0001
  d.map((r)=>{
    let nom=nbin*(r[colid]-mm[0])
    let b=Math.floor(nom/denom)
    bi[b][r[_c]]++
  })
  let left=_zct()
  let right=cls.slice()
  let spctr = [0,d.length]
  let totctr = spctr[1];
  let itotal = i0
  bi.map((bin,i)=>{
    bin.map((v,j)=>{
      left[j]+=v;right[j]-=v;
      spctr[0]+=v;spctr[1]-=v;
    })
    let w1 = spctr[0]/totctr
    let w2 =  spctr[1]/totctr
    let i1 = _impur_b(left,spctr[0])
    let i2 = _impur_b(right,spctr[1])
    let gain = itotal-w1*i1-w2*i2
    if(gain > best.g)
      best = {g:gain,v:i,c:colid,i1:i1,i2:i2}
  })
  best.v = (best.v+0.99)*denom/nbin+mm[0]
  return best;
}

function best(d,nod,i0){
  nod.cls=_ctcls(d)
  if(d.length < 2 || i0<=0)return {};
  let b = {g:-1,L:[],R:[]}
  for(let c = 0; c < _c; c++){
    let csp = scan(i0,d,c);
    if(csp.g > b.g)Object.assign(b,csp);
  }
  if(b.g < 0)return {g:-1};
  d.map(x=>x[b.c]<b.v?b.L.push(x):b.R.push(x))
  nod.f=b.c
  nod.v=b.v;
  nod.L={}
  nod.R={}
  return b
}

function split(d,nod,i0){
  let s = best(d,nod,i0)
  if(s.L)split(s.L,nod.L,s.i1)
  if(s.R)split(s.R,nod.R,s.i2)
}

let root={}

console.log("training...")

var _gimpur = _impur_b(_ctcls(_data),_data.length)
split(_data,root,_gimpur)

//lg(root)
draw(root, document.getElementById("root"))
fixlast();
