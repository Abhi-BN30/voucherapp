import "dotenv/config";
import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";
import readline from "readline";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not defined");
const sql=neon(process.env.DATABASE_URL);
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const ask=(q:string)=>new Promise<string>(resolve=>rl.question(q,resolve));
(async()=>{try{const username=(await ask("Username: ")).trim().toLowerCase(); const name=(await ask("Name: ")).trim(); const pin=(await ask("4-digit PIN: ")).trim(); if(!username||!name||!/^[0-9]{4}$/.test(pin))throw new Error("Username, name and a 4-digit PIN are required."); const existing=await sql`SELECT user_id FROM users WHERE LOWER(username)=${username} LIMIT 1`; if(existing.length)throw new Error("Username already exists."); const pinHash=await bcrypt.hash(pin,12); const rows=await sql`INSERT INTO users(username,name,pin_hash) VALUES(${username},${name},${pinHash}) RETURNING user_id,username,name`; console.log("User created:",rows[0]);}catch(error){console.error(error instanceof Error?error.message:error);}finally{rl.close();}})();
