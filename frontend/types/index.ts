export type Project={id:string;name:string;client:string;type:string;owner:string;stage:string;status:string;deadline:string;progress:number;risk:string;area:number;revenue:number;cost:number;hours:number;createdAt:string};
export type DocumentRecord={id:string;name:string;category:string;projectId:string;date:string;status:string;confidence:number;area:number;url?:string};
export type Issue={id:string;title:string;priority:string;detail:string;resolved:boolean;comments:string[]};
export type Analysis={id:string;projectId:string;date:string;score:number;documents:number;issues:Issue[]};
export type Quant={id:string;projectId:string;date:string;area:number};
