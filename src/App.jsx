import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getDocs, getDoc, query, where, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';
import { Search, ShoppingBag, Menu, X, ArrowRight, UserRound, LogOut, Plus, Minus, Heart, Instagram, ChevronDown } from 'lucide-react';

const seed = [
  {id:'look-01',name:'The Everyday Edit',category:'Clothing',price:490,tag:'NEW',description:'An effortless wardrobe staple with a considered silhouette.',image:'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=85'},
  {id:'bag-01',name:'The City Tote',category:'Bags',price:620,tag:'BESTSELLER',description:'Your everyday companion, made for everything ahead.',image:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=900&q=85'},
  {id:'acc-01',name:'The Signature Set',category:'Accessories',price:180,tag:'NEW',description:'Small details. A distinctive finish.',image:'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=85'},
  {id:'look-02',name:'Soft Structure',category:'Clothing',price:540,tag:'',description:'Clean lines and a relaxed, confident fit.',image:'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85'},
  {id:'bag-02',name:'The Mini Shoulder',category:'Bags',price:390,tag:'',description:'A compact silhouette for your essentials.',image:'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=85'},
  {id:'acc-02',name:'Everyday Gold Tones',category:'Accessories',price:150,tag:'',description:'Finishing touches for your own kind of style.',image:'https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=85'}
];


function ProductReviews({ product, user }) {
  const [reviews,setReviews]=useState([]);
  const [rating,setRating]=useState(0);
  const [comment,setComment]=useState('');
  const [loadingReviews,setLoadingReviews]=useState(true);
  const [saving,setSaving]=useState(false);
  const [reviewed,setReviewed]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    let alive=true;
    const load=async()=>{
      try {
        const snap=await getDocs(query(collection(db,'products',product.id,'reviews'),orderBy('createdAt','desc')));
        if(alive) setReviews(snap.docs.map(d=>({id:d.id,...d.data()})));
        if(user){
          const mine=await getDoc(doc(db,'products',product.id,'reviews',user.uid));
          if(alive) setReviewed(mine.exists());
        }
      } catch(e) {
        if(alive) setMessage('Reviews are temporarily unavailable.');
      } finally { if(alive) setLoadingReviews(false); }
    };
    load();
    return ()=>{alive=false};
  },[product.id,user]);

  const average=reviews.length?(reviews.reduce((sum,r)=>sum+Number(r.rating||0),0)/reviews.length):0;
  const submit=async(e)=>{
    e.preventDefault();
    if(!user){setMessage('Please sign in to leave a review.');return;}
    if(!rating||!comment.trim()){setMessage('Choose a star rating and write a comment first.');return;}
    setSaving(true);setMessage('');
    try {
      await setDoc(doc(db,'products',product.id,'reviews',user.uid),{
        userId:user.uid,
        userName:user.displayName||'KAOUKABI customer',
        rating,
        comment:comment.trim().slice(0,1000),
        createdAt:serverTimestamp()
      });
      setReviewed(true);
      setReviews(old=>[{id:user.uid,userName:user.displayName||'KAOUKABI customer',rating,comment:comment.trim(),createdAt:new Date()},...old]);
      setComment('');
      setMessage('Thank you — your review has been published!');
    } catch(e) {
      setMessage('We couldn’t save your review. Please try again in a moment.');
    } finally {setSaving(false);}
  };

  return <details className="reviews">
    <summary><span>REVIEWS & RATINGS</span><span className="review-summary">{reviews.length?<>★ {average.toFixed(1)} · {reviews.length} {reviews.length===1?'review':'reviews'}</>:'Be the first to review'}</span></summary>
    <div className="reviews-content">
      <div className="reviews-overview"><strong>{reviews.length?average.toFixed(1):'—'}</strong><span className="review-stars">{'★'.repeat(Math.round(average))}{'☆'.repeat(5-Math.round(average))}</span><small>{reviews.length} {reviews.length===1?'customer review':'customer reviews'}</small></div>
      {loadingReviews?<p className="review-muted">Loading reviews…</p>:reviews.length?reviews.map(r=><article className="review-entry" key={r.id}><div className="review-entry-head"><strong>{r.userName||'KAOUKABI customer'}</strong><span className="review-stars">{'★'.repeat(Number(r.rating)||0)}{'☆'.repeat(5-(Number(r.rating)||0))}</span></div><p>{r.comment}</p></article>):<p className="review-muted">No reviews yet. Share your experience with this piece.</p>}
      {reviewed?<p className="review-muted">You’ve already reviewed this piece. Thank you!</p>:<form className="review-form" onSubmit={submit}>
        <h4>{user?'Write a review':'Sign in to leave a review'}</h4>
        {user?<><div className="star-picker" role="group" aria-label="Choose a rating">{[1,2,3,4,5].map(n=><button type="button" key={n} className={n<=rating?'selected':''} onClick={()=>setRating(n)} aria-label={n+' stars'}>★</button>)}</div><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={1000} placeholder="What did you think of this piece?" rows="3"/><button className="review-submit" disabled={saving}>{saving?'PUBLISHING…':'PUBLISH REVIEW'}</button></>:<p className="review-muted">Use the account icon at the top of the page to sign in first.</p>}
        {message&&<p className="review-message">{message}</p>}
      </form>}
    </div>
  </details>;
}

const EUR_MAD_RATE = 10.95; // Approximate reference rate; refresh periodically.\nconst money = n => new Intl.NumberFormat('fr-MA',{maximumFractionDigits:0}).format(n) + ' MAD';\nconst euro = n => '€' + (Number(n || 0) / EUR_MAD_RATE).toFixed(2);

export default function App(){
  const [products,setProducts]=useState(seed);
  const [category,setCategory]=useState('All');
  const [search,setSearch]=useState('');
  const [cart,setCart]=useState([]);
  const [cartOpen,setCartOpen]=useState(false);
  const [mobileOpen,setMobileOpen]=useState(false);
  const [user,setUser]=useState(null);
  const [notice,setNotice]=useState('');
  const [favorites,setFavorites]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>onAuthStateChanged(auth,u=>setUser(u)),[]);
  useEffect(()=>{
    let alive=true;
    getDocs(query(collection(db,'products'),where('published','==',true)))
      .then(s=>{if(alive&&!s.empty)setProducts(s.docs.map(d=>({id:d.id,...d.data()})));})
      .catch(()=>{})
      .finally(()=>{if(alive)setLoading(false)});
    return ()=>{alive=false};
  },[]);
  const shown=useMemo(()=>products.filter(p=>(category==='All'||p.category===category)&&((p.name||'').toLowerCase().includes(search.toLowerCase())||(p.description||'').toLowerCase().includes(search.toLowerCase()))),[products,category,search]);
  const count=cart.reduce((n,p)=>n+p.qty,0);
  const total=cart.reduce((n,p)=>n+p.price*p.qty,0);
  const add=p=>{setCart(old=>{const found=old.find(x=>x.id===p.id);return found?old.map(x=>x.id===p.id?{...x,qty:x.qty+1}:x):[...old,{...p,qty:1}]});setNotice('Added to your bag');setTimeout(()=>setNotice(''),2200)};
  const change=(id,delta)=>setCart(old=>old.map(p=>p.id===id?{...p,qty:p.qty+delta}:p).filter(p=>p.qty>0));
  const whatsapp=()=>{
    const phone='212600000000'; // Replace with the store's WhatsApp number before launch.
    const lines=cart.map(p=>p.name+' × '+p.qty+' — '+money(p.price*p.qty)).join('\n');
    window.open('https://wa.me/'+phone+'?text='+encodeURIComponent('Hello KAOUKABI! I would like to order:\n'+lines+'\nTotal: '+money(total)),'_blank','noopener,noreferrer');
  };
  const login=async()=>{try{await signInWithPopup(auth,googleProvider)}catch(e){setNotice(e.code==='auth/popup-closed-by-user'?'Sign-in cancelled':'Could not sign in. Check Firebase Authentication settings.')}};
  const categories=['All','Clothing','Bags','Accessories'];
  return <div className="site">
    <div className="announcement">A LITTLE SOMETHING SPECIAL — DISCOVER THE NEW COLLECTION <span>✳</span></div>
    <header className="header">
      <button className="icon-btn mobile-menu" onClick={()=>setMobileOpen(!mobileOpen)} aria-label="Menu">{mobileOpen?<X/>:<Menu/>}</button>
      <nav className={'nav '+(mobileOpen?'nav-open':'')}><a href="#shop" onClick={()=>setMobileOpen(false)}>SHOP</a><a href="#story" onClick={()=>setMobileOpen(false)}>OUR STORY</a><a href="#featured" onClick={()=>setMobileOpen(false)}>THE EDIT</a></nav>
      <a className="wordmark" href="#"><span className="crown">♛</span> KAOUKABI <small>MADE TO BE REMEMBERED</small></a>
      <div className="header-actions">
        <label className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search pieces..." /></label>
        {user?<button className="icon-btn" title="Sign out" onClick={()=>signOut(auth)}><LogOut size={19}/></button>:<button className="icon-btn" title="Sign in with Google" onClick={login}><UserRound size={19}/></button>}
        <button className="bag-btn" onClick={()=>setCartOpen(true)} aria-label="Open shopping bag"><ShoppingBag size={19}/><span>BAG ({count})</span></button>
      </div>
    </header>
    <main>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">THE KAOUKABI POINT OF VIEW</p><h1>Style is in<br/><em>the details.</em></h1><p className="hero-text">Pieces to keep. Details to remember. Discover a considered edit of clothing, bags and accessories.</p><a className="button button-light" href="#shop">EXPLORE THE COLLECTION <ArrowRight size={16}/></a><div className="hero-note">DESIGNED WITH INTENTION · MADE IN MOROCCO</div></div>
        <div className="hero-image"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=90" alt="Women's fashion editorial"/><div className="image-stamp">THE<br/>NEW<br/><b>MOOD</b></div></div>
        <div className="hero-side">KAOUKABI — EST. WITH LOVE</div>
      </section>
      <section className="ticker"><span>LESS, BUT BETTER</span><b>✳</b><span>YOUR STYLE, YOUR STORY</span><b>✳</b><span>MADE TO BE REMEMBERED</span></section>
      <section className="shop-section" id="shop">
        <div className="section-heading"><div><p className="eyebrow">A CURATED SELECTION</p><h2>Find your <em>favourite.</em></h2></div><p>Thoughtful pieces for every version of you.</p></div>
        <div className="shop-toolbar"><div className="filters">{categories.map(c=><button key={c} className={category===c?'filter active':'filter'} onClick={()=>setCategory(c)}>{c==='All'?'ALL':c.toUpperCase()}</button>)}</div><span className="result-count">{shown.length} PIECES</span></div>
        <div className="product-grid">{shown.map((p,i)=><article className="product" key={p.id}><div className="product-image"><img src={p.image} alt={p.name} loading="lazy"/>{p.tag&&<span className="product-tag">{p.tag}</span>}<button className={'heart '+(favorites.includes(p.id)?'hearted':'')} onClick={()=>setFavorites(old=>old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id])} aria-label="Save favourite"><Heart size={18} fill={favorites.includes(p.id)?'currentColor':'none'}/></button><button className="quick-add" onClick={()=>add(p)}>ADD TO BAG <Plus size={15}/></button></div><div className="product-info"><div className="product-price"><strong>{money(p.price)}</strong><span title="Approximate euro conversion">{`(${euro(p.price)})`}</span></div><h3>{p.name}</h3><p className="product-category">{p.category}</p></div><p className="product-description">{p.description}</p><button className="product-add-button" onClick={()=>add(p)}>ADD TO CART <ShoppingBag size={15}/></button><ProductReviews product={p} user={user}/></article>)}</div>
        {!shown.length&&<div className="empty">No pieces found. Try another search.</div>}
        {loading&&<p className="loading-note">Checking the latest collection…</p>}
      </section>
      <section className="feature" id="featured"><div className="feature-photo"><img src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1100&q=85" alt="Fashion collection"/></div><div className="feature-copy"><p className="eyebrow">THE ART OF EVERYDAY</p><h2>Not just what<br/>you wear. <em>How<br/>you feel.</em></h2><p>We believe the right piece does more than complete an outfit. It becomes part of your story.</p><a href="#shop" className="text-link">DISCOVER THE EDIT <ArrowRight size={16}/></a></div></section>
      <section className="story" id="story"><p className="eyebrow">A NOTE FROM KAOUKABI</p><h2>Rooted in Morocco.<br/><em>Made for everywhere.</em></h2><p>KAOUKABI is a celebration of personal style, thoughtful details and the beauty of pieces chosen with care.</p><span>WITH LOVE, KAOUKABI ♡</span></section>
      <section className="newsletter"><div><p className="eyebrow">STAY IN THE KNOW</p><h2>A little note from us.</h2><p>Follow along for new arrivals, stories and special finds.</p></div><a className="button button-dark" href="https://www.instagram.com/" target="_blank" rel="noreferrer"><Instagram size={17}/> FOLLOW OUR JOURNEY</a></section>
    </main>
    <footer><a className="footer-logo" href="#">KAOUKABI</a><span>THOUGHTFULLY CHOSEN. FOREVER YOURS.</span><span>© {new Date().getFullYear()} KAOUKABI</span></footer>
    {notice&&<div className="toast">{notice}</div>}
    {cartOpen&&<div className="drawer-backdrop" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><h2>Your bag <span>({count})</span></h2><button className="icon-btn" onClick={()=>setCartOpen(false)}><X/></button></div>{!cart.length?<div className="cart-empty"><ShoppingBag size={35}/><h3>Your bag is waiting.</h3><p>Find something you love.</p><button className="button button-dark" onClick={()=>setCartOpen(false)}>CONTINUE SHOPPING</button></div>:<><div className="cart-items">{cart.map(p=><div className="cart-item" key={p.id}><img src={p.image} alt={p.name}/><div className="cart-item-info"><h3>{p.name}</h3><span>{money(p.price)}</span><div className="quantity"><button onClick={()=>change(p.id,-1)}><Minus size={13}/></button><span>{p.qty}</span><button onClick={()=>change(p.id,1)}><Plus size={13}/></button></div></div><strong>{money(p.price*p.qty)}</strong></div>)}</div><div className="cart-bottom"><div className="subtotal"><span>Subtotal</span><strong>{money(total)}</strong></div><p>Delivery details will be confirmed on WhatsApp.</p><button className="button button-dark checkout" onClick={whatsapp}>ORDER VIA WHATSAPP <ArrowRight size={16}/></button><small>Online card payment will be available once the store payment provider is connected.</small></div></>}</aside></div>}
  </div>;
}