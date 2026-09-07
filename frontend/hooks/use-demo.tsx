'use client';
import {createContext,useContext,useState,useEffect,useCallback} from 'react';
import {projects as seedProjects,documents as seedDocuments,analyses as seedAnalyses} from '@/services/mock-data';
import type {Project,DocumentRecord,Analysis,Quant} from '@/types';
type DemoState={projects:Project[];documents:DocumentRecord[];analyses:Analysis[];quants:Quant[]};
type DemoContext=DemoState&{update:(fn:(s:DemoState)=>DemoState)=>void;notice:(s:string)=>void;ready:boolean};
const Context=createContext<DemoContext|null>(null);
export function DemoProvider({children}:{children:React.ReactNode}){const[state,setState]=useState<DemoState>({projects:seedProjects,documents:seedDocuments,analyses:seedAnalyses,quants:[{id:'quant-1',projectId:'2',date:'2026-09-07',area:148.7}]});const[message,setMessage]=useState('');const[ready,setReady]=useState(false);useEffect(()=>{try{const saved=sessionStorage.getItem('arq-demo-v1');if(saved)setState(JSON.parse(saved))}catch{}setReady(true)},[]);useEffect(()=>{if(ready)sessionStorage.setItem('arq-demo-v1',JSON.stringify(state))},[state,ready]);useEffect(()=>{if(message){const t=setTimeout(()=>setMessage(''),4300);return()=>clearTimeout(t)}},[message]);const notice=useCallback((s:string)=>setMessage(s),[]);return <Context.Provider value={{...state,update:setState,notice,ready}}>{children}{message&&<div className="toast" role="status"><span>✓</span>{message}<button onClick={()=>setMessage('')} aria-label="Fechar aviso">×</button></div>}</Context.Provider>}
export function useDemo(){const c=useContext(Context);if(!c)throw Error('DemoProvider ausente');return c}
