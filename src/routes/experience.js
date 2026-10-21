const express = require('express');
const crypto = require('crypto');
const path = require('path');
const { pool } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { getAccessTier } = require('../access');
const { levels } = require('../plans');
const library = require('../content/library.json');
const router = express.Router();
const goals = ['entender','interesses','conversa'];
function monthSince(date) { return Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/(30*86400000))); }
const key = () => crypto.createHash('sha256').update('back-to-me-journal-v1:' + process.env.JWT_SECRET).digest();
function seal(value) { const iv=crypto.randomBytes(12), cipher=crypto.createCipheriv('aes-256-gcm',key(),iv);return [iv.toString('base64'),cipher.update(JSON.stringify(value),'utf8','base64')+cipher.final('base64'),cipher.getAuthTag().toString('base64')].join('.'); }
function open(value) { const [iv,data,tag]=value.split('.'), d=crypto.createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));d.setAuthTag(Buffer.from(tag,'base64'));return JSON.parse(d.update(data,'base64','utf8')+d.final('utf8')); }
router.get('/sample', (req,res)=>res.json({exercise:library.exercises[0]}));
router.get('/sample/audio', (req,res)=>res.sendFile(path.join(__dirname,'../../media/cena.m4a')));
router.use(authenticateToken);
router.get('/', async(req,res)=>{
 try {
  const tier=await getAccessTier(req.user.id),level=levels[tier]||0;
  const user=(await pool.query('SELECT created_at FROM users WHERE id=$1',[req.user.id])).rows[0];
  const state=(await pool.query('SELECT goal,completed,reminder FROM experience_state WHERE user_id=$1',[req.user.id])).rows[0]||{goal:null,completed:[],reminder:false};
  const month=monthSince(user.created_at);
  res.json({state,level,month,paths:library.paths,monthlyPaths:library.monthlyPaths,continuity:level>=1?library.continuity:[],conversationTemplates:level>=2?library.conversationTemplates:[],exercises:library.exercises.map(e=>level>=e.level&&month>=(e.releaseMonth||0)?e:{id:e.id,title:e.title,goal:e.goal,level:e.level,releaseMonth:e.releaseMonth||0,locked:true}),workshops:library.workshops.map(w=>level>=3&&month>=w.releaseMonth?w:{id:w.id,title:w.title,releaseMonth:w.releaseMonth,locked:true}),audioIds:['cena','momento','separar','energia','pedido','limite']});
 } catch {res.status(500).json({error:'Unable to load experience'});}
});
router.post('/state',async(req,res)=>{
 try {
  const {goal,complete,reminder}=req.body;
  if(goal!==undefined&&!goals.includes(goal)||complete!==undefined&&!library.exercises.some(e=>e.id===complete)||reminder!==undefined&&typeof reminder!=='boolean')return res.status(400).json({error:'Invalid state'});
  if(complete){const e=library.exercises.find(e=>e.id===complete);const created=(await pool.query('SELECT created_at FROM users WHERE id=$1',[req.user.id])).rows[0].created_at;if((levels[await getAccessTier(req.user.id)]||0)<e.level||monthSince(created)<(e.releaseMonth||0))return res.status(403).json({error:'Upgrade required'});}
  await pool.query(`INSERT INTO experience_state(user_id,goal,completed,reminder) VALUES($1,$2,$3,$4)
   ON CONFLICT(user_id) DO UPDATE SET goal=COALESCE($2,experience_state.goal),completed=ARRAY(SELECT DISTINCT unnest(experience_state.completed || $3::text[])),reminder=COALESCE($5,experience_state.reminder),updated_at=NOW()`,[req.user.id,goal||null,complete?[complete]:[],reminder||false,reminder??null]);
  res.json({success:true});
 }catch{res.status(500).json({error:'Unable to save progress'});}
});
router.get('/audio/:id',async(req,res)=>{
 try {
 const exercise=library.exercises.find(e=>e.id===req.params.id),workshop=library.workshops.find(w=>w.id===req.params.id);
 if(!['cena','momento','separar','energia','pedido','limite'].includes(req.params.id)&&!workshop)return res.sendStatus(404);
 const level=levels[await getAccessTier(req.user.id)]||0;
 const created=(await pool.query('SELECT created_at FROM users WHERE id=$1',[req.user.id])).rows[0]?.created_at;
 if(level<(workshop?3:req.params.id==='cena'?0:2)||workshop&&monthSince(created)<workshop.releaseMonth)return res.sendStatus(403);
 res.set('Cache-Control','private, no-store').sendFile(path.join(__dirname,'../../media',req.params.id+'.m4a'));
 } catch { res.sendStatus(500); }
});
// Reading/exporting/deleting an existing journal remains available after paid access ends.
router.get('/journal',async(req,res)=>{
 try{const rows=(await pool.query('SELECT id,content,created_at FROM journal_entries WHERE user_id=$1 ORDER BY id DESC LIMIT 500',[req.user.id])).rows;res.json({entries:rows.map(r=>({id:r.id,created_at:r.created_at,...open(r.content)}))});}catch{res.status(500).json({error:'Unable to read journal'});}
});
router.post('/journal',async(req,res)=>{
 try{
  if((levels[await getAccessTier(req.user.id)]||0)<2)return res.status(403).json({error:'Upgrade required'});
  const {title,content}=req.body;
  if(typeof title!=='string'||!title.trim()||title.length>120||typeof content!=='string'||!content.trim()||content.length>8000)return res.status(400).json({error:'Invalid entry'});
  const count=(await pool.query('SELECT count(*)::int n FROM journal_entries WHERE user_id=$1',[req.user.id])).rows[0].n;
  if(count>=500)return res.status(409).json({error:'Journal limit reached; export or remove entries'});
  const row=(await pool.query("INSERT INTO journal_entries(user_id,title,content) VALUES($1,'Reflexão',$2) RETURNING id",[req.user.id,seal({title,content})])).rows[0];res.status(201).json(row);
 }catch{res.status(500).json({error:'Unable to save entry'});}
});
router.delete('/journal/:id',async(req,res)=>{
 try{const result=await pool.query('DELETE FROM journal_entries WHERE id=$1 AND user_id=$2',[/^\d+$/.test(req.params.id)?Number(req.params.id):0,req.user.id]);res.status(result.rowCount?200:404).json({success:!!result.rowCount});}catch{res.sendStatus(500);}
});
router.post('/event',async(req,res)=>{
 const allowed=['exercise_started','exercise_completed','useful_yes','useful_no','offer_viewed','audio_played','workshop_opened'];
 if(!allowed.includes(req.body.event)||Object.keys(req.body).some(k=>k!=='event'))return res.status(400).json({error:'Only anonymous-content event names accepted'});
 try{await pool.query('INSERT INTO product_events(user_id,event) VALUES($1,$2)',[req.user.id,req.body.event]);res.json({success:true});}catch{res.sendStatus(500);}
});
module.exports=router;
