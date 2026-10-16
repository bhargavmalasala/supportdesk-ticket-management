import {Router} from 'express';
import {pool} from '../db.js';
import {auth,allow} from '../middleware/auth.js';
const router=Router(); router.use(auth);
const statuses=['Open','In Progress','Resolved','Closed'], priorities=['Low','Medium','High','Urgent'];
function visibleSql(user){ if(user.role==='admin')return {sql:'TRUE',args:[]}; if(user.role==='agent')return {sql:'(t.assignee_id=$1 OR t.assignee_id IS NULL)',args:[user.id]}; return {sql:'t.customer_id=$1',args:[user.id]}; }
router.get('/',async(req,res,next)=>{try{
 const {sql,args}=visibleSql(req.user); const vals=[...args]; let where=sql;
 const add=(clause,val)=>{vals.push(val);where+=` AND ${clause.replace('?',`$${vals.length}`)}`;};
 if(req.query.status&&statuses.includes(req.query.status))add('t.status=?',req.query.status);
 if(req.query.priority&&priorities.includes(req.query.priority))add('t.priority=?',req.query.priority);
 if(req.query.q){const term=`%${String(req.query.q).slice(0,100)}%`;vals.push(term,term);where+=` AND (t.title ILIKE $${vals.length-1} OR t.description ILIKE $${vals.length})`;}
 const page=Math.max(1,parseInt(req.query.page)||1),limit=Math.min(50,Math.max(1,parseInt(req.query.limit)||10));
 const count=await pool.query(`SELECT COUNT(*)::int count FROM tickets t WHERE ${where}`,vals);
 const rows=await pool.query(`SELECT t.*,c.name customer_name,a.name assignee_name FROM tickets t JOIN users c ON c.id=t.customer_id LEFT JOIN users a ON a.id=t.assignee_id WHERE ${where} ORDER BY t.updated_at DESC LIMIT $${vals.length+1} OFFSET $${vals.length+2}`,[...vals,limit,(page-1)*limit]);
 res.json({tickets:rows.rows,total:count.rows[0].count,page,limit});
 }catch(e){next(e);}});
router.post('/',allow('customer','admin'),async(req,res,next)=>{const client=await pool.connect();try{
 const {title,description,priority='Medium'}=req.body;if(!title?.trim()||!description?.trim())return res.status(400).json({error:'Title and description are required'});if(!priorities.includes(priority))return res.status(400).json({error:'Invalid priority'});
 await client.query('BEGIN');const r=await client.query('INSERT INTO tickets(title,description,priority,customer_id) VALUES($1,$2,$3,$4) RETURNING *',[title.trim(),description.trim(),priority,req.user.id]);await client.query('INSERT INTO ticket_history(ticket_id,user_id,action,details) VALUES($1,$2,$3,$4)',[r.rows[0].id,req.user.id,'Ticket created',`Priority: ${priority}`]);await client.query('COMMIT');req.app.get('io').emit('ticket:changed',{ticketId:r.rows[0].id});res.status(201).json({ticket:r.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e);}finally{client.release();}});
router.get('/agents',allow('agent','admin'),async(req,res,next)=>{try{const r=await pool.query("SELECT id,name,email FROM users WHERE role IN ('agent','admin') ORDER BY name");res.json({agents:r.rows});}catch(e){next(e);}});
router.get('/:id',async(req,res,next)=>{try{
 const r=await pool.query('SELECT t.*,c.name customer_name,c.email customer_email,a.name assignee_name FROM tickets t JOIN users c ON c.id=t.customer_id LEFT JOIN users a ON a.id=t.assignee_id WHERE t.id=$1',[req.params.id]);if(!r.rowCount)return res.status(404).json({error:'Ticket not found'});const t=r.rows[0];if(req.user.role==='customer'&&t.customer_id!==req.user.id)return res.status(403).json({error:'Access denied'});if(req.user.role==='agent'&&t.assignee_id&&t.assignee_id!==req.user.id)return res.status(403).json({error:'This ticket is assigned to another agent'});
 const [comments,history]=await Promise.all([pool.query('SELECT c.*,u.name user_name,u.role user_role FROM comments c JOIN users u ON u.id=c.user_id WHERE c.ticket_id=$1 ORDER BY c.created_at',[t.id]),pool.query('SELECT h.*,u.name user_name FROM ticket_history h JOIN users u ON u.id=h.user_id WHERE h.ticket_id=$1 ORDER BY h.created_at DESC',[t.id])]);res.json({ticket:t,comments:comments.rows,history:history.rows});
 }catch(e){next(e);}});
router.patch('/:id',allow('agent','admin'),async(req,res,next)=>{const client=await pool.connect();try{
 const {status,priority,assignee_id}=req.body;if(status&&!statuses.includes(status))return res.status(400).json({error:'Invalid status'});if(priority&&!priorities.includes(priority))return res.status(400).json({error:'Invalid priority'});
 await client.query('BEGIN');const old=await client.query('SELECT * FROM tickets WHERE id=$1 FOR UPDATE',[req.params.id]);if(!old.rowCount){await client.query('ROLLBACK');return res.status(404).json({error:'Ticket not found'});}const t=old.rows[0];
 if(req.user.role==='agent'&&t.assignee_id&&t.assignee_id!==req.user.id){await client.query('ROLLBACK');return res.status(403).json({error:'Ticket assigned to another agent'});}
 let assignee=t.assignee_id;if(assignee_id!==undefined){if(assignee_id===null||assignee_id==='')assignee=null;else{const a=await client.query("SELECT id FROM users WHERE id=$1 AND role IN ('agent','admin')",[assignee_id]);if(!a.rowCount){await client.query('ROLLBACK');return res.status(400).json({error:'Assignee must be an agent or admin'});}assignee=Number(assignee_id);}}
 const nextStatus=status||t.status,nextPriority=priority||t.priority;const r=await client.query('UPDATE tickets SET status=$1,priority=$2,assignee_id=$3,updated_at=NOW(),resolved_at=CASE WHEN $1 IN (\'Resolved\',\'Closed\') THEN COALESCE(resolved_at,NOW()) ELSE NULL END WHERE id=$4 RETURNING *',[nextStatus,nextPriority,assignee,t.id]);
 for(const [key,value] of [['status',nextStatus],['priority',nextPriority],['assignee',assignee]]){const oldVal=key==='status'?t.status:key==='priority'?t.priority:t.assignee_id;if(String(oldVal??'')!==String(value??''))await client.query('INSERT INTO ticket_history(ticket_id,user_id,action,details) VALUES($1,$2,$3,$4)',[t.id,req.user.id,`${key} updated`,`${oldVal??'Unassigned'} → ${value??'Unassigned'}`]);}
 await client.query('COMMIT');req.app.get('io').emit('ticket:changed',{ticketId:t.id});res.json({ticket:r.rows[0]});
 }catch(e){await client.query('ROLLBACK');next(e);}finally{client.release();}});
router.post('/:id/comments',async(req,res,next)=>{try{const body=req.body.body?.trim();if(!body)return res.status(400).json({error:'Comment cannot be empty'});const t=await pool.query('SELECT * FROM tickets WHERE id=$1',[req.params.id]);if(!t.rowCount)return res.status(404).json({error:'Ticket not found'});if(req.user.role==='customer'&&t.rows[0].customer_id!==req.user.id)return res.status(403).json({error:'Access denied'});if(req.user.role==='agent'&&t.rows[0].assignee_id&&t.rows[0].assignee_id!==req.user.id)return res.status(403).json({error:'Access denied'});const r=await pool.query('INSERT INTO comments(ticket_id,user_id,body) VALUES($1,$2,$3) RETURNING *',[t.rows[0].id,req.user.id,body]);await pool.query('UPDATE tickets SET updated_at=NOW() WHERE id=$1',[t.rows[0].id]);await pool.query('INSERT INTO ticket_history(ticket_id,user_id,action,details) VALUES($1,$2,$3,$4)',[t.rows[0].id,req.user.id,'Comment added',body.slice(0,200)]);req.app.get('io').emit('ticket:changed',{ticketId:t.rows[0].id});res.status(201).json({comment:{...r.rows[0],user_name:req.user.name,user_role:req.user.role}});}catch(e){next(e);}});
export default router;
