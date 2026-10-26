import * as Sentry from '@sentry/browser';
import {ERROR_CODES,DATA_COLLECTION,sanitiseEvent,filterEnvelope} from './monitoring-privacy.mjs';
const config=__DTP_MONITORING_CONFIG__;
const context={origin:location.origin,release:config.release,environment:config.environment};
Sentry.init({
 dsn:config.dsn,release:config.release,environment:config.environment,defaultIntegrations:false,
 integrations:[Sentry.globalHandlersIntegration({onerror:true,onunhandledrejection:true}),Sentry.browserApiErrorsIntegration()],
 dataCollection:DATA_COLLECTION,maxBreadcrumbs:0,sendClientReports:false,debug:false,
 beforeBreadcrumb:()=>null,beforeSendLog:()=>null,beforeSendMetric:()=>null,
 beforeSend:event=>sanitiseEvent(event,context),
 transport:options=>{
  const base=Sentry.makeFetchTransport({...options,fetchOptions:{credentials:'omit',referrerPolicy:'no-referrer'}});
  return {send:envelope=>{const safe=filterEnvelope(envelope,context);return safe?base.send(safe):Promise.resolve({statusCode:200});},flush:timeout=>base.flush(timeout)};
 }
});
window.DTPMonitoring=Object.freeze({
 captureCode(code){if(!Object.hasOwn(ERROR_CODES,code))return null;return Sentry.captureException(new Error(ERROR_CODES[code]),{level:'error',tags:{dtp_code:code}});},
 flush:()=>Sentry.flush(5000)
});
