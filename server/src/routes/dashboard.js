import {Router} from 'express';import {pool} from '../db.js';import {auth,allow} from '../middleware/auth.js';
const router=Router();router.use(auth,allow('admin'));
router.get('/',async(req,res,next)=>{try{const [totals,statuses,priorities,agents,recent]=await Promise.all([
pool.query("SELECT COUNT(*)::int total,COUNT(*) FILTER(WHERE status='Open')::int open,COUNT(*) FILTER(WHERE status='In Progress')::int in_progress,COUNT(*) FILTER(WHERE status='Resolved')::int resolved,COUNT(*) FILTER(WHERE status='Closed')::int closed,ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at-created_at))/3600)::numeric,1) avg_resolution_hours FROM tickets"),
pool.query('SELECT status,COUNT(*)::int count FROM tickets GROUP BY status ORDER BY status'),
pool.query('SELECT priority,COUNT(*)::int count FROM tickets GROUP BY priority ORDER BY priority'),
pool.query("SELECT u.id,u.name,COUNT(t.id)::int assigned,COUNT(t.id) FILTER(WHERE t.status IN ('Resolved','Closed'))::int resolved FROM users u LEFT JOIN tickets t ON t.assignee_id=u.id WHERE u.role='agent' GROUP BY u.id,u.name ORDER BY assigned DESC LIMIT 8"),
pool.query('SELECT t.id,t.title,t.status,t.priority,t.updated_at,u.name customer_name FROM tickets t JOIN users u ON u.id=t.customer_id ORDER BY t.updated_at DESC LIMIT 6')]);res.json({summary:totals.rows[0],byStatus:statuses.rows,byPriority:priorities.rows,agents:agents.rows,recent:recent.rows});}catch(e){next(e);}});
export default router;
