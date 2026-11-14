import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('KAOUKABI render error:', error, info);
  }
  render() {
    if (this.state.error) {
      return <main style={{minHeight:'100vh',padding:'40px 7%',background:'#faf8f5',color:'#651f32',fontFamily:'Arial,sans-serif'}}>
        <h1 style={{fontFamily:'Georgia,serif'}}>KAOUKABI</h1>
        <h2>The page hit an error while loading.</h2>
        <p>Please send this error text to support:</p>
        <pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',padding:16,background:'#eee8e2',color:'#211c1b'}}>{String(this.state.error?.stack || this.state.error?.message || this.state.error)}</pre>
      </main>;
    }
    return this.props.children;
  }
}

const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<p style="padding:30px;font:16px Arial">KAOUKABI could not find its page container (#root).</p>';
} else {
  createRoot(root).render(<AppErrorBoundary><App /></AppErrorBoundary>);
}
