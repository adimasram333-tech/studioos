const SUPABASE_URL = "https://gnnaaagvlrmdveqxicob.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_TnjoiedXWPbSjjqh2tmfsQ_kpiIMaND";

const supabase = window.supabase.createClient(
SUPABASE_URL,
SUPABASE_ANON_KEY
);

async function saveQuotation(data){

const {data:result,error}=await supabase
.from("quotations")
.insert([data])
.select();

if(error){

console.error(error);
alert("Error saving quotation");
return null;

}

return result[0];

}

async function getQuotationById(id){

const {data,error}=await supabase
.from("quotations")
.select("*")
.eq("id",id)
.single();

if(error){

console.error(error);
return null;

}

return data;

}

window.saveQuotation=saveQuotation;
window.getQuotationById=getQuotationById;