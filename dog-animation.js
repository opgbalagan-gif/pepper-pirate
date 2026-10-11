(function(root){
  'use strict';
  class DogAnimator {
    constructor(canvas,container){
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.container=container;
      this.state='idle';this.elapsed=0;this.duration=0;this.next=null;this.images={};this.ready=false;this.lastFrame=-1;
      this.load();
    }
    async load(){
      try{
        const response=await fetch('assets/dog-head-animation.json');
        if(!response.ok)throw Error('Animation manifest unavailable');
        this.manifest=await response.json();
        await Promise.all(Object.entries(this.manifest.clips).map(([name,clip])=>new Promise((resolve,reject)=>{
          const image=new Image();image.onload=()=>{this.images[name]=image;resolve();};image.onerror=reject;image.src='assets/'+clip.file;
        })));
        this.canvas.width=this.canvas.height=this.manifest.size;this.ready=true;
        this.container.classList.add('video-ready');this.container.dataset.animation='ready';this.draw();
      }catch(error){this.container.dataset.animation='fallback';}
    }
    setState(name,duration,next=null){
      this.state=name;this.elapsed=0;this.duration=duration||0;this.next=next;this.lastFrame=-1;
      this.container.dataset.state=name;this.draw();
    }
    update(dt){
      if(!this.ready)return;
      this.elapsed+=dt;
      const clip=this.manifest.clips[this.state];
      if(!clip)return;
      const duration=this.duration||clip.seconds;
      if(!clip.loop && this.elapsed>=duration && this.next){const next=this.next;this.setState(next,next==='chew'?.65:0,next==='chew'?'idle':null);}
      this.draw();
    }
    draw(){
      if(!this.ready)return;
      const clip=this.manifest.clips[this.state];if(!clip)return;
      const duration=this.duration||clip.seconds;
      let progress=this.elapsed/duration;
      if(clip.loop){progress%=clip.pingpong?2:1;if(clip.pingpong && progress>1)progress=2-progress;}
      else progress=Math.min(1,progress);
      const index=Math.min(clip.frames-1,Math.floor(progress*clip.frames));
      if(index===this.lastFrame)return;this.lastFrame=index;
      const size=this.manifest.size,columns=this.manifest.columns;
      this.ctx.clearRect(0,0,size,size);
      this.ctx.drawImage(this.images[this.state],(index%columns)*size,Math.floor(index/columns)*size,size,size,0,0,size,size);
    }
  }
  root.DogAnimator=DogAnimator;
})(window);
