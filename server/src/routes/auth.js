import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {pool} from '../db.js';
import {auth} from '../middleware/auth.js';
const router=Router();
const publicUser=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
router.post('/register',async(req,res,next)=>{try{
 const {name,email,password}=req.body;
 if(!name?.trim()||!email?.trim()||!password||password.length<8) return res.status(400).json({error:'Name, email and password (at least 8 characters) are required'});
 const hash=await bcrypt.hash(password,12);
 const result=await pool.query("INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'customer') RETURNING *",[name.trim(),email.toLowerCase().trim(),hash]);
 const u=result.rows[0],token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},process.env.JWT_SECRET,{expiresIn:'8h'});
 res.status(201).json({token,user:publicUser(u)});
 }catch(e){if(e.code==='23505')return res.status(409).json({error:'An account with this email already exists'});next(e);}});
router.post('/login',async(req,res,next)=>{try{
 const {email,password}=req.body; const r=await pool.query('SELECT * FROM users WHERE email=$1',[String(email||'').toLowerCase().trim()]);
 if(!r.rowCount||!(await bcrypt.compare(password||'',r.rows[0].password_hash)))return res.status(401).json({error:'Invalid email or password'});
 const u=r.rows[0],token=jwt.sign({id:u.id,name:u.name,email:u.email,role:u.role},process.env.JWT_SECRET,{expiresIn:'8h'});
 res.json({token,user:publicUser(u)});
 }catch(e){next(e);}});
router.get('/me',auth,(req,res)=>res.json({user:req.user}));
export default router;
