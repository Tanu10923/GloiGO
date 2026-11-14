const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');

async function request(path, token=null, options={}) {
  if (!API_BASE_URL) {
    throw new Error('Backend URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in the project .env file.');
  }
  const headers = {Accept:'application/json','Content-Type':'application/json',...(options.headers||{})};
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {...options, headers});
  } catch (_) {
    throw new Error(`Cannot connect to GloiGO server (${API_BASE_URL}). Check that the backend is running and your phone can reach the PC.`);
  }
  const raw = await response.text();
  let data={};
  try { data=raw?JSON.parse(raw):{}; } catch (_) { data={detail:raw}; }
  if (!response.ok) {
    const detail=data.detail||data.message||`Request failed (${response.status})`;
    const error = new Error(typeof detail==='string'?detail:JSON.stringify(detail));
    error.status = response.status;
    throw error;
  }
  return data;
}
export const loginApi=(email,password)=>request('/auth/login',null,{method:'POST',body:JSON.stringify({email:email.trim(),password})});
export const registerApi=({full_name,email,password})=>request('/auth/register',null,{method:'POST',body:JSON.stringify({full_name:full_name.trim(),email:email.trim(),password,role:'driver'})});
export const meApi=token=>request('/auth/me',token);
export async function driverProfileApi(token) {
  return request('/drivers/me',token);
}
export const applyDriverApi=(token,license_number)=>request('/drivers/apply',token,{method:'POST',body:JSON.stringify({license_number:license_number.trim()})});
export async function bookingsApi(token) {
  const data=await request('/drivers/bookings',token);
  const rows=Array.isArray(data.bookings)?data.bookings:[];
  return data.active_booking?[data.active_booking,...rows]:rows;
}
export const availabilityApi=(token,is_online)=>request('/drivers/availability',token,{method:'PATCH',body:JSON.stringify({is_online})});
export const acceptApi=(token,id)=>request(`/drivers/bookings/${encodeURIComponent(id)}/accept`,token,{method:'PATCH'});
export const rejectApi=(token,id)=>request(`/drivers/bookings/${encodeURIComponent(id)}/reject`,token,{method:'PATCH'});
export const startApi=(token,id)=>request(`/drivers/bookings/${encodeURIComponent(id)}/start`,token,{method:'PATCH'});
export const completeApi=(token,id)=>request(`/drivers/bookings/${encodeURIComponent(id)}/complete`,token,{method:'PATCH'});
export const locationApi=(token,latitude,longitude,accuracy_meters=50)=>request('/drivers/location',token,{method:'PUT',body:JSON.stringify({latitude,longitude,accuracy_meters})});
