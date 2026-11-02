/* Stock Lab offline storage: IndexedDB + legacy migration + rolling local snapshots. */
const StockLabStorage = (() => {
  const DB_NAME = "stock-lab-local";
  const DB_VERSION = 1;
  let db;
  const stores = ["products","categories","history","snapshots"];
  const request = (req) => new Promise((resolve,reject) => {
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error || new Error("IndexedDB request failed"));
  });
  function open() {
    return new Promise((resolve,reject) => {
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{
        const d=req.result;
        for(const name of stores) if(!d.objectStoreNames.contains(name))
          d.createObjectStore(name,{keyPath:"id"});
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error || new Error("Could not open local database"));
      req.onblocked=()=>reject(new Error("Local database upgrade is blocked by another tab"));
    });
  }
  async function getAll(store) {
    const tx=db.transaction(store,"readonly");
    return request(tx.objectStore(store).getAll());
  }
  async function replace(store, values) {
    const tx=db.transaction(store,"readwrite");
    const os=tx.objectStore(store);
    os.clear();
    values.forEach((value,index)=>os.put({id:String(value.id ?? index),order:index,value}));
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  }
  async function read(store) {
    const rows=await getAll(store);
    return rows.sort((a,b)=>(a.order??0)-(b.order??0)).map(row=>row.value);
  }
  async function writeSnapshot(payload) {
    const tx=db.transaction("snapshots","readwrite");
    const os=tx.objectStore("snapshots");
    const id=Date.now();
    os.put({id:String(id),createdAt:id,payload});
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    const rows=await getAll("snapshots");
    rows.sort((a,b)=>b.createdAt-a.createdAt);
    if(rows.length>10){
      const trim=db.transaction("snapshots","readwrite");
      rows.slice(10).forEach(row=>trim.objectStore("snapshots").delete(row.id));
      await new Promise((resolve,reject)=>{trim.oncomplete=resolve;trim.onerror=()=>reject(trim.error);});
    }
  }
  async function init() {
    if(!("indexedDB" in window)) throw new Error("This browser does not support IndexedDB");
    db=await open();
    const existing=await getAll("products");
    if(existing.length===0){
      const legacyProducts=JSON.parse(localStorage.getItem("stock_lab_products_v21") || localStorage.getItem("stock_lab_products_v4") || "[]");
      const legacyCategories=JSON.parse(localStorage.getItem("stock_lab_categories_v21") || "[]");
      const legacyHistory=JSON.parse(localStorage.getItem("stock_lab_scan_history_v21") || "[]");
      if(!Array.isArray(legacyProducts)||!Array.isArray(legacyCategories)||!Array.isArray(legacyHistory))
        throw new Error("Legacy inventory data is invalid; original local data has been preserved.");
      await replace("products",legacyProducts);
      await replace("categories",legacyCategories);
      await replace("history",legacyHistory);
      // Remove bulky legacy product JSON only after all IndexedDB writes have succeeded.
      localStorage.removeItem("stock_lab_products_v21");
      localStorage.removeItem("stock_lab_products_v4");
      localStorage.setItem("stock_lab_idb_migrated_v1","1");
    }
    return true;
  }
  async function loadAll() {
    const [products,categories,history]=await Promise.all([read("products"),read("categories"),read("history")]);
    return {products,categories,history};
  }
  async function saveProducts(values){await replace("products",values);}
  async function saveCategories(values){await replace("categories",values);}
  async function saveHistory(values){await replace("history",values);}
  async function autoBackup(payload) {
    const rows=await getAll("snapshots");
    const newest=rows.reduce((max,row)=>Math.max(max,row.createdAt||0),0);
    if(Date.now()-newest>=24*60*60*1000) await writeSnapshot(payload);
  }
  async function restore(payload) {
    if(!payload || !Array.isArray(payload.products) || !Array.isArray(payload.categories) || !Array.isArray(payload.scanHistory))
      throw new Error("Invalid Stock Lab backup format");
    const tx=db.transaction(["products","categories","history"],"readwrite");
    for(const [name,values] of [["products",payload.products],["categories",payload.categories],["history",payload.scanHistory]]){
      const os=tx.objectStore(name); os.clear();
      values.forEach((value,index)=>os.put({id:String(value.id ?? index),order:index,value}));
    }
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
    await writeSnapshot(payload);
  }
  return {init,loadAll,saveProducts,saveCategories,saveHistory,autoBackup,restore};
})();
window.StockLabStorage=StockLabStorage;
