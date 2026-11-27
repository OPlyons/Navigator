import PDFDocument from 'pdfkit';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {unresolvedSourceNotice} from '../navigator/shared.mjs';

const date = value => new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
export function printableListing(resource) {
  const warning = unresolvedSourceNotice(resource);
  return {
    warning,
    url: warning ? resource.unconfirmedContact?.url || '' : resource.url,
    linkLabel: warning ? resource.unconfirmedContact?.label || '' : 'Service website',
    checked: 'Last source check: '+date(resource.lastChecked)+'. '+(resource.verificationStatus || 'Check current details with the provider')+'.',
  };
}

// Built from the same catalogue as the website on every publication. No network
// requests or service-verification dates are changed by making a PDF.
export async function buildDirectoryPdfs({root,out,directory,compiledOn = new Date().toISOString().slice(0,10)}) {
  const source = await fs.readFile(path.join(root,'data/directory.json'));
  const manifest = {compiledOn,catalogueSha256:createHash('sha256').update(source).digest('hex'),files:{}};
  for (const [area,filename] of Object.entries(directory.areaDownloads)) {
    const name=directory.directories.find(d=>d.id===area).name;
    const resources=directory.resources.filter(r=>r.directoryId===area).sort((a,b)=>a.category.localeCompare(b.category,'en')||a.name.localeCompare(b.name,'en'));
    const doc=new PDFDocument({
      size:'A4', margins:{top:55,bottom:55,left:48,right:48}, bufferPages:true,
      info:{
        Title:name+' - local support directory',
        Author:'CNWL Community Navigator',
        Subject:'Compiled '+compiledOn+'; source-check dates are shown per listing',
        CreationDate:new Date(compiledOn+'T00:00:00Z'),
      },
    });
    const chunks=[];const complete=new Promise((resolve,reject)=>{doc.on('data',chunk=>chunks.push(chunk));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
    doc.registerFont('Body',path.join(root,'public/assets/fonts/dm-sans.woff'));
    doc.registerFont('Heading',path.join(root,'public/assets/fonts/archivo-black.woff'));
    const width=doc.page.width-96,bottom=doc.page.height-60;
    const line=(text,size=12,color='#29272c',font='Body',options={})=>doc.font(font).fontSize(size).fillColor(color).text(text,{width,lineGap:3,...options});
    line('COMMUNITY NAVIGATOR',10,'#604970');doc.moveDown(.7);
    line(name,25,'#392c46','Heading');line('Local support directory',18);doc.moveDown(.6);
    line('Compiled '+date(compiledOn)+' | '+resources.length+' listings',11);
    doc.moveDown(.5);line('This PDF uses the current website catalogue at the time it is compiled. Compilation is not a new check of every service. Source-check dates and any unresolved warnings appear with each listing.');
    doc.moveDown(.5);line('Check current opening times, eligibility, costs and availability with the service before travelling or applying.');
    doc.moveDown(.5);line('For immediate danger, serious injury or overdose, call 999 or go to A&E. For urgent mental health support, call NHS 111 and select the mental health option.');
    doc.moveDown(.5);line('For current listings and other areas: navigator.lxportal.space',11,'#513164','Body',{link:'https://navigator.lxportal.space/',underline:true});
    doc.addPage();
    let category='';
    for(const r of resources){
      const print=printableListing(r);
      const rows=[
        [r.name,15,'#392c46','Heading'],
        ...(print.warning?[[print.warning,12,'#74420e']]:[]),
        [r.description,12],['Who it is for: '+r.who,12],['How to access: '+r.access,12],['Before you go: '+r.check,12],
        ...(r.coverage?[['Area covered: '+r.coverage,12]]:[]),
        ...(r.phone?[['Phone: '+r.phone,12]]:[]),
        ...(print.url?[[print.linkLabel+': '+print.url,10,'#513164','Body',{link:print.url,underline:true}]]:[]),
        [print.checked,10,'#57515b'],
      ];
      const height=rows.reduce((sum,[text,size,,font='Body'])=>sum+doc.font(font).fontSize(size).heightOfString(text,{width,lineGap:3})+6,0)+16;
      const newCategory=category!==r.category;
      if(doc.y+height+(newCategory?40:0)>bottom&&doc.y>56)doc.addPage();
      if(newCategory){category=r.category;line(category,16,'#604970','Heading');doc.moveDown(.6);}
      for(const [text,size,color,font,options] of rows){line(text,size,color,font,options);doc.y+=6;}
      doc.moveTo(48,doc.y+2).lineTo(doc.page.width-48,doc.y+2).strokeColor('#d6cdd5').stroke();doc.y+=18;
    }
    const pages=doc.bufferedPageRange().count;
    for(let page=0;page<pages;page++){
      doc.switchToPage(page);
      const margin=doc.page.margins.bottom;
      doc.page.margins.bottom=0;
      doc.font('Body').fontSize(9).fillColor('#57515b').text(name+' | '+date(compiledOn)+' | '+(page+1)+' / '+pages,48,doc.page.height-35,{width,lineBreak:false});
      doc.page.margins.bottom=margin;
    }
    doc.end();const pdf=await complete;
    await fs.writeFile(path.join(out,'assets',filename),pdf);
    manifest.files[area]={
      filename, count:resources.length, ids:resources.map(r=>r.id),
      pages, bytes:pdf.length, sha256:createHash('sha256').update(pdf).digest('hex'),
    };
  }
  await fs.writeFile(path.join(out,'assets/directory-pdfs.json'),JSON.stringify(manifest,null,2)+'\n');
  return manifest;
}
