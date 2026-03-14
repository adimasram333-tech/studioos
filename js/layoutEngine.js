// =============================
// STUDIOOS PROPOSAL LAYOUT ENGINE
// =============================

// Available layouts
const proposalLayouts = [
"classic-layout",
"magazine-layout",
"luxury-layout"
];

// =============================
// SELECT LAYOUT
// =============================

function selectLayout(id){

if(!id){
return "classic-layout";
}

// simple hash
let hash = 0;

for(let i=0;i<id.length;i++){
hash = id.charCodeAt(i) + ((hash << 5) - hash);
}

const index = Math.abs(hash) % proposalLayouts.length;

return proposalLayouts[index];

}

// =============================
// APPLY LAYOUT
// =============================

function applyProposalLayout(layout){

const page = document.getElementById("proposalPage");

if(!page) return;

// remove previous classes
proposalLayouts.forEach(l => page.classList.remove(l));

// apply layout
page.classList.add(layout);

}

// =============================
// INIT ENGINE
// =============================

function initLayoutEngine(){

// quotation id from URL
const params = new URLSearchParams(window.location.search);

let id = params.get("id");

// fallback slug
if(!id){
id = params.get("slug");
}

// select layout
const layout = selectLayout(id);

// apply
applyProposalLayout(layout);

}

// =============================
// RUN ENGINE
// =============================

window.addEventListener("DOMContentLoaded", initLayoutEngine);