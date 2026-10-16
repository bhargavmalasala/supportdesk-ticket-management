import {io} from 'socket.io-client';
const API=import.meta.env.VITE_API_URL||'http://localhost:4000/api';
export const getToken=()=>localStorage.getItem('sd_token');
export async function api(path,options={}){const headers={'Content-Type':'application/json',...(options.headers||{})};if(getToken())headers.Authorization=`Bearer ${getToken()}`;const r=await fetch(`${API}${path}`,{...options,headers});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Request failed');return data;}
export function socket(){return io(import.meta.env.VITE_SOCKET_URL||'http://localhost:4000',{auth:{token:getToken()}})}
