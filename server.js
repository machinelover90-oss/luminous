const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const ASSETS = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets.json'), 'utf8'));
const CSS = ASSETS.css;
const COVERS_SVG = ASSETS.covers;
const SEED = ASSETS.seed;

const DATA_FILE = path.join(__dirname, 'posts.json');
function readAll() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return null; }
}
function writeAll(posts) { fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2)); }
if (readAll() === null) writeAll(SEED);

function slugify(t){return String(t).toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80)||'post';}
function getPosts(){return (readAll()||[]).sort((a,b)=>(b.date||'').localeCompare(a.date||''));}
function getPost(s){return (readAll()||[]).find(p=>p.slug===s);}
function getPostById(id){return (readAll()||[]).find(p=>p.id===id);}
function getByCategory(c){return getPosts().filter(p=>(p.category||'').toLowerCase()===String(c).toLowerCase());}
function categories(){return [...new Set((readAll()||[]).map(p=>p.category).filter(Boolean))].sort();}
const GRADS=['linear-gradient(135deg,#2a1f3d,#c9a24b)','linear-gradient(135deg,#1e2b3a,#c9a24b)','linear-gradient(135deg,#2d1f2e,#c9a24b)','linear-gradient(135deg,#1f2e26,#c9a24b)','linear-gradient(135deg,#1e2440,#c9a24b)','linear-gradient(135deg,#2a2333,#c9a24b)'];
function createPost(d){
  const posts=readAll()||[];let base=slugify(d.slug||d.title),slug=base,n=2;
  while(posts.some(p=>p.slug===slug))slug=base+'-'+(n++);
  const post={id:'p'+Date.now().toString(36),slug,title:d.title||'Untitled',category:d.category||'News',author:d.author||'Editorial Desk',date:d.date||new Date().toISOString().slice(0,10),cover:d.cover||GRADS[Math.floor(Math.random()*GRADS.length)],image:d.image||'',excerpt:d.excerpt||'',body:d.body||'',featured:!!d.featured};
  posts.push(post);writeAll(posts);return post;
}
function updatePost(id,d){
  const posts=readAll()||[];const i=posts.findIndex(p=>p.id===id);if(i<0)return null;const c=posts[i];
  posts[i]={...c,title:d.title??c.title,category:d.category??c.category,author:d.author??c.author,date:d.date??c.date,image:d.image??c.image,excerpt:d.excerpt??c.excerpt,body:d.body??c.body,featured:d.featured!==undefined?!!d.featured:c.featured};
  writeAll(posts);return posts[i];
}
function deletePost(id){const posts=readAll()||[];const next=posts.filter(p=>p.id!==id);writeAll(next);return next.length!==posts.length;}

function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function fmtDate(d){if(!d)return '';const x=new Date(d+'T00:00:00');if(isNaN(x))return esc(d);return x.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});}
function bodyToHtml(b){return String(b||'').split(/\n{2,}/).map(p=>'<p>'+esc(p.trim()).replace(/\n/g,'<br>')+'</p>').join('\n');}
function coverStyle(post){if(post.image)return "background:#14121b url('"+esc(post.image)+"') center/cover no-repeat";return 'background:'+esc(post.cover);}
function nav(cats){const links=cats.map(c=>'<a href="/category/'+encodeURIComponent(c.toLowerCase())+'">'+esc(c)+'</a>').join('');return '<nav class="topnav"><div class="wrap nav-inner"><a class="brand" href="/">LUMINOUS<span>&middot; celebrity</span></a><div class="nav-links">'+links+'</div><a class="admin-link" href="/admin">Admin</a></div></nav>';}
function layout(o){const title=o.title,body=o.body,cats=o.categories||[];return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+esc(title)+' &middot; Luminous</title><link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,500&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/styles.css"></head><body>'+nav(cats)+'<main>'+body+'</main><footer class="site-footer"><div class="wrap"><span class="brand small">LUMINOUS</span><p>An entertainment journal. Stories sourced from public reporting.</p></div></footer></body></html>';}
function card(post,big){return '<article class="card '+(big?'card-big':'')+'"><a class="card-cover" href="/article/'+esc(post.slug)+'" style="'+coverStyle(post)+'"><span class="cat-chip">'+esc(post.category)+'</span></a><div class="card-body"><h3><a href="/article/'+esc(post.slug)+'">'+esc(post.title)+'</a></h3><p class="excerpt">'+esc(post.excerpt)+'</p><div class="meta">'+esc(post.author)+' &middot; '+fmtDate(post.date)+'</div></div></article>';}
function home(o){const posts=o.posts,cats=o.categories;const feat=posts.filter(p=>p.featured).slice(0,2);const ids=new Set(feat.map(p=>p.id));const rest=posts.filter(p=>!ids.has(p.id));const hero=feat.length?'<section class="hero wrap">'+feat.map(p=>card(p,true)).join('')+'</section>':'';const grid=rest.length?'<section class="wrap"><h2 class="section-title">Latest Stories</h2><div class="grid">'+rest.map(p=>card(p)).join('')+'</div></section>':'<section class="wrap"><p class="empty">No stories yet. Head to the <a href="/admin">admin panel</a>.</p></section>';const body='<header class="masthead wrap"><p class="kicker">The Entertainment Journal</p><h1>Where the spotlight lives.</h1></header>'+hero+grid;return layout({title:'Home',body,categories:cats});}
function article(o){const post=o.post,related=o.related,cats=o.categories;const rel=related.length?'<section class="wrap related"><h2 class="section-title">More Stories</h2><div class="grid">'+related.map(p=>card(p)).join('')+'</div></section>':'';const body='<article class="post"><div class="post-cover" style="'+coverStyle(post)+'"></div><div class="wrap post-inner"><span class="cat-chip dark">'+esc(post.category)+'</span><h1>'+esc(post.title)+'</h1><div class="post-meta">By '+esc(post.author)+' &middot; '+fmtDate(post.date)+'</div><div class="post-body">'+bodyToHtml(post.body)+'</div><a class="back" href="/">&larr; Back to all stories</a></div></article>'+rel;return layout({title:post.title,body,categories:cats});}
function categoryPage(o){const name=o.name,posts=o.posts,cats=o.categories;const grid=posts.length?'<div class="grid">'+posts.map(p=>card(p)).join('')+'</div>':'<p class="empty">No stories in this category yet.</p>';const body='<header class="masthead wrap"><p class="kicker">Category</p><h1>'+esc(name)+'</h1></header><section class="wrap">'+grid+'</section>';return layout({title:name,body,categories:cats});}
function notFound(o){const body='<section class="wrap" style="text-align:center;padding:120px 0"><h1 style="font-size:64px">404</h1><p class="empty">That page slipped past the paparazzi. <a href="/">Return home</a>.</p></section>';return layout({title:'Not found',body,categories:o.categories});}
function adminShell(inner){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Admin &middot; Luminous</title><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/styles.css"></head><body class="admin"><nav class="topnav admin-nav"><div class="wrap nav-inner"><a class="brand" href="/admin">LUMINOUS<span>&middot; admin</span></a><div class="nav-links"><a href="/">View site</a><a href="/admin/logout">Log out</a></div></div></nav><main class="wrap admin-main">'+inner+'</main></body></html>';}
function adminLogin(err){return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Sign in &middot; Luminous</title><link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/styles.css"></head><body class="admin login-page"><form class="login-card" method="post" action="/admin/login"><span class="brand">LUMINOUS</span><p class="kicker">Editor sign in</p>'+(err?'<div class="flash error">'+esc(err)+'</div>':'')+'<label>Password<input type="password" name="password" autofocus required></label><button type="submit">Enter newsroom</button></form></body></html>';}
function adminDashboard(o){const posts=o.posts,flash=o.flash;const rows=posts.map(p=>'<tr><td><strong>'+esc(p.title)+'</strong><div class="muted">/'+esc(p.slug)+'</div></td><td>'+esc(p.category)+'</td><td>'+fmtDate(p.date)+'</td><td>'+(p.featured?'<span class="badge">Featured</span>':'')+'</td><td class="actions"><a class="btn small" href="/admin/edit/'+esc(p.id)+'">Edit</a><a class="btn small ghost" href="/article/'+esc(p.slug)+'" target="_blank">View</a><form method="post" action="/admin/delete/'+esc(p.id)+'" onsubmit="return confirm(&quot;Delete this story?&quot;)"><button class="btn small danger" type="submit">Delete</button></form></td></tr>').join('');const inner='<div class="admin-head"><div><h1>Stories</h1><p class="muted">'+posts.length+' published</p></div><a class="btn" href="/admin/new">+ New story</a></div>'+(flash?'<div class="flash ok">'+esc(flash)+'</div>':'')+'<table class="admin-table"><thead><tr><th>Title</th><th>Category</th><th>Date</th><th></th><th></th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" class="muted">No stories yet.</td></tr>')+'</tbody></table>';return adminShell(inner);}
function adminForm(o){const p=o.post||{},action=o.action,heading=o.heading;const picker=['bokeh','stage','red-carpet','flashbulbs','award-star','music'].map(name=>{const url='/images/covers/'+name+'.svg';const sel=p.image===url?' selected':'';return '<button type="button" class="cover-opt'+sel+'" data-url="'+url+'" onclick="pickCover(this)" style="background-image:url(&#39;'+url+'&#39;)" title="'+name+'"></button>';}).join('');const script='<scr'+'ipt>function pickCover(el){document.querySelectorAll(".cover-opt").forEach(function(b){b.classList.remove("selected")});el.classList.add("selected");document.getElementById("imageInput").value=el.dataset.url}function clearCoverSel(){var v=document.getElementById("imageInput").value;document.querySelectorAll(".cover-opt").forEach(function(b){b.classList.toggle("selected",b.dataset.url===v)})}</scr'+'ipt>';return adminShell('<div class="admin-head"><h1>'+esc(heading)+'</h1><a class="btn ghost" href="/admin">Cancel</a></div><form class="post-form" method="post" action="'+esc(action)+'"><label>Title<input name="title" value="'+esc(p.title||'')+'" required></label><div class="row"><label>Category<input name="category" value="'+esc(p.category||'News')+'"></label><label>Author<input name="author" value="'+esc(p.author||'Editorial Desk')+'"></label><label>Date<input type="date" name="date" value="'+esc(p.date||'')+'"></label></div><label>Cover image <span class="opt">(click one, or paste your own link below)</span></label><div class="cover-picker">'+picker+'<button type="button" class="cover-opt none'+(!p.image?' selected':'')+'" data-url="" onclick="pickCover(this)" title="Gradient">Gradient</button></div><label>Or paste an image link <span class="opt">(optional)</span><input name="image" id="imageInput" value="'+esc(p.image||'')+'" placeholder="/images/my-photo.jpg or https://..." oninput="clearCoverSel()"></label>'+script+'<label>Excerpt<textarea name="excerpt" rows="2">'+esc(p.excerpt||'')+'</textarea></label><label>Body<textarea name="body" rows="14" placeholder="Separate paragraphs with a blank line.">'+esc(p.body||'')+'</textarea></label><label class="check"><input type="checkbox" name="featured" '+(p.featured?'checked':'')+'> Feature on homepage</label><button class="btn" type="submit">Save story</button></form>');}

app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||'luminous-secret-change-me',resave:false,saveUninitialized:false}));
const send=(res,html)=>res.set('Content-Type','text/html').send(html);

app.get('/css/styles.css',(req,res)=>res.set('Content-Type','text/css').send(CSS));
app.get('/images/covers/:name.svg',(req,res)=>{const svg=COVERS_SVG[req.params.name];if(!svg)return res.status(404).end();res.set('Content-Type','image/svg+xml').send(svg);});

app.get('/',(req,res)=>send(res,home({posts:getPosts(),categories:categories()})));
app.get('/article/:slug',(req,res)=>{const post=getPost(req.params.slug);if(!post)return send(res.status(404),notFound({categories:categories()}));const related=getPosts().filter(p=>p.id!==post.id).slice(0,3);send(res,article({post,related,categories:categories()}));});
app.get('/category/:cat',(req,res)=>{const posts=getByCategory(req.params.cat);const name=posts[0]?posts[0].category:req.params.cat;send(res,categoryPage({name,posts,categories:categories()}));});

function requireAuth(req,res,next){if(req.session&&req.session.authed)return next();res.redirect('/admin/login');}
app.get('/admin/login',(req,res)=>{if(req.session.authed)return res.redirect('/admin');send(res,adminLogin(null));});
app.post('/admin/login',(req,res)=>{if(req.body.password===ADMIN_PASSWORD){req.session.authed=true;return res.redirect('/admin');}send(res,adminLogin('Incorrect password. Try again.'));});
app.get('/admin/logout',(req,res)=>{req.session.destroy(()=>res.redirect('/admin/login'));});
app.get('/admin',requireAuth,(req,res)=>{const flash=req.session.flash;req.session.flash=null;send(res,adminDashboard({posts:getPosts(),flash}));});
app.get('/admin/new',requireAuth,(req,res)=>send(res,adminForm({post:{date:new Date().toISOString().slice(0,10)},action:'/admin/new',heading:'New story'})));
app.post('/admin/new',requireAuth,(req,res)=>{const b=req.body;createPost({title:b.title,category:b.category,author:b.author,date:b.date,image:b.image,excerpt:b.excerpt,body:b.body,featured:b.featured==='on'});req.session.flash='Story published.';res.redirect('/admin');});
app.get('/admin/edit/:id',requireAuth,(req,res)=>{const post=getPostById(req.params.id);if(!post)return res.redirect('/admin');send(res,adminForm({post,action:'/admin/edit/'+post.id,heading:'Edit story'}));});
app.post('/admin/edit/:id',requireAuth,(req,res)=>{const b=req.body;updatePost(req.params.id,{title:b.title,category:b.category,author:b.author,date:b.date,image:b.image,excerpt:b.excerpt,body:b.body,featured:b.featured==='on'});req.session.flash='Story updated.';res.redirect('/admin');});
app.post('/admin/delete/:id',requireAuth,(req,res)=>{deletePost(req.params.id);req.session.flash='Story deleted.';res.redirect('/admin');});

app.use((req,res)=>send(res.status(404),notFound({categories:categories()})));
app.listen(PORT,()=>console.log('Luminous live on '+PORT));
