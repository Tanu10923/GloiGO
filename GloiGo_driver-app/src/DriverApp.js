import React, {useEffect,useMemo,useRef,useState} from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, RefreshControl, Linking
} from 'react-native';
import * as Location from 'expo-location';
import {Ionicons, MaterialCommunityIcons} from '@expo/vector-icons';
import {
  loginApi,registerApi,applyDriverApi,meApi,driverProfileApi,bookingsApi,availabilityApi,acceptApi,rejectApi,startApi,completeApi,locationApi
} from './api';

const C={pink:'#E91662',blush:'#F3D5D8',ivory:'#FFF9F5',plum:'#542D43',sage:'#9AA88A',ink:'#343238',white:'#FFFFFF',muted:'#827780',line:'#EADDE1',green:'#18845B',red:'#C43D55',black:'#080808'};
const activeStatuses=['accepted','arriving','in_progress'];
const fmt=s=>s?new Date(s).toLocaleString():'—';
const errText=e=>e?.message || 'Something went wrong. Please try again.';

function Txt({children,style}) { return <Text style={[{color:C.ink},style]}>{children}</Text>; }
function Button({title,onPress,secondary=false,danger=false,disabled=false,icon,loading=false}) {
  return <TouchableOpacity disabled={disabled||loading} onPress={onPress} activeOpacity={0.82}
    style={[s.btn,{backgroundColor:danger?'#FCE9ED':secondary?'#FFF4F6':C.pink,borderColor:danger?'#F3C6D0':secondary?C.line:C.pink,opacity:disabled||loading?0.55:1}]}>
    {loading?<ActivityIndicator color={secondary?C.plum:C.white}/>:icon?<Ionicons name={icon} size={17} color={danger?C.red:secondary?C.plum:C.white}/>:null}
    <Text style={{color:danger?C.red:secondary?C.plum:C.white,fontWeight:'800',fontSize:13}}>{title}</Text>
  </TouchableOpacity>;
}
function Card({children,style}) { return <View style={[s.card,style]}>{children}</View>; }
function Field({label,value,onChangeText,placeholder,secureTextEntry,keyboardType}) {
  return <View style={{marginBottom:13}}>
    <Txt style={s.label}>{label}</Txt>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#A69AA1"
      secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize="none"
      style={s.input}/>
  </View>;
}
function StatusPill({status}) {
  const color=status==='approved'||status==='completed'?C.green:status==='rejected'||status==='cancelled'?C.red:'#A56A12';
  return <View style={[s.pill,{backgroundColor:color+'18'}]}><View style={[s.dot,{backgroundColor:color}]}/><Txt style={{fontSize:10,fontWeight:'900',color,textTransform:'uppercase'}}>{String(status||'unknown').replace(/_/g,' ')}</Txt></View>;
}
function BookingCard({b,onAccept,onReject,onOpen,working}) {
  const items=Array.isArray(b.hygiene_items)?b.hygiene_items:(b.hygiene_items?[String(b.hygiene_items)]:[]);
  return <Card>
    <View style={s.between}><Txt style={{fontWeight:'900',fontSize:14}}>Request #{String(b.id).slice(-8)}</Txt><StatusPill status={b.status}/></View>
    <Txt style={s.muted}>{b.customer_name||'GloiGO customer'} · {fmt(b.created_at)}</Txt>
    <View style={s.detail}><Ionicons name="location-outline" size={17} color={C.pink}/><Txt style={{flex:1,fontSize:13,lineHeight:19}}>{b.pickup_address}</Txt></View>
    <View style={s.detail}><Ionicons name="call-outline" size={16} color={C.pink}/><Txt style={{fontSize:13}}>{b.mobile_number||'Phone not available'}</Txt></View>
    {!!(b.pads_requested||items.length) && <Txt style={s.muted}>Essentials: {b.pads_requested?`Pads × ${b.pads_quantity||1} `:''}{items.join(', ')}</Txt>}
    {!!b.customer_notes && <Txt style={s.note}>Customer note: {b.customer_notes}</Txt>}
    <View style={s.between}><Txt style={{fontWeight:'900',color:C.pink}}>Fare: ₹{b.fare??'—'}</Txt><Txt style={s.muted}>{b.payment_method||'Payment not set'}</Txt></View>
    {b.status==='pending'?<View style={s.actions}>
      <View style={{flex:1}}><Button title="Accept" icon="checkmark" onPress={()=>onAccept(b)} loading={working}/></View>
      <View style={{flex:1}}><Button title="Reject" icon="close" danger onPress={()=>onReject(b)} disabled={working}/></View>
    </View>:<Button title="View trip details" secondary icon="chevron-forward" onPress={()=>onOpen(b)}/>}
  </Card>;
}

export default function DriverApp() {
  const [token,setToken]=useState(null),[user,setUser]=useState(null),[profile,setProfile]=useState(null),[van,setVan]=useState(null);
  const [bookings,setBookings]=useState([]),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false);
  const [page,setPage]=useState('Home'),[theme,setTheme]=useState('light'),[error,setError]=useState('');
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[fullName,setFullName]=useState(''),[licenseNumber,setLicenseNumber]=useState('');
  const [authMode,setAuthMode]=useState('login');
  const [coords,setCoords]=useState(null),[tracking,setTracking]=useState(false);
  const watchRef=useRef(null);

  const dark=theme==='dark';
  const colors=dark?{bg:C.black,surface:'#151515',text:'#FFFFFF',muted:'#AAA',line:'#303030',input:'#202020'}:{bg:C.ivory,surface:C.white,text:C.ink,muted:C.muted,line:C.line,input:'#FFFCFD'};
  const pending=bookings.filter(b=>b.status==='pending');
  const active=bookings.find(b=>activeStatuses.includes(b.status))||null;
  const history=bookings.filter(b=>['completed','cancelled'].includes(b.status));

  const stopWatch=()=>{if(watchRef.current){watchRef.current.remove();watchRef.current=null;}setTracking(false);};
  const loadData=async t=>{
    setLoading(true);setError('');
    try{
      const u=await meApi(t);
      if(u.role!=='driver') throw new Error('This account is not registered as a GloiGO driver.');
      setUser(u);
      try {
        const driverProfile=await driverProfileApi(t);
        setProfile(driverProfile);
        setVan(null);
        if(driverProfile.verification_status==='approved' && driverProfile.is_online) setBookings(await bookingsApi(t));
        else setBookings([]);
      } catch (e) {
        if(e.status===404 || String(e.message||'').toLowerCase().includes('not found')) {
          setProfile(null);
          setBookings([]);
        } else throw e;
      }
    }catch(e){setError(errText(e));throw e;}finally{setLoading(false);}
  };
  useEffect(()=>()=>stopWatch(),[]);
  useEffect(()=>{if(!token||!profile?.is_online||profile.verification_status!=='approved')return;
    const timer=setInterval(async()=>{try{setBookings(await bookingsApi(token));}catch(e){}},15000);
    return ()=>clearInterval(timer);
  },[token,profile?.is_online,profile?.verification_status]);
  useEffect(()=>{if(!token||!profile?.is_online||profile.verification_status!=='approved')return;
    let sub;
    (async()=>{
      try{
        const perm=await Location.requestForegroundPermissionsAsync();
        if(!perm.granted){setError('Location permission is needed while you are online.');return;}
        sub=await Location.watchPositionAsync({accuracy:Location.Accuracy.Balanced,timeInterval:15000,distanceInterval:30},pos=>{
          const {latitude,longitude,accuracy}=pos.coords;setCoords({latitude,longitude});locationApi(token,latitude,longitude,accuracy||50).catch(()=>{});
        });
        watchRef.current=sub;setTracking(true);
      }catch(e){setError('Unable to start location tracking: '+errText(e));}
    })();
    return ()=>{sub?.remove();if(watchRef.current===sub)watchRef.current=null;setTracking(false);};
  },[token,profile?.is_online,profile?.verification_status]);

  const login=async()=>{
    if(!email.trim()||!password)return Alert.alert('Details required','Enter your driver email and password.');
    setBusy(true);setError('');
    try{
      const result=await loginApi(email,password);
      if(!result.access_token)throw new Error('Backend did not return an access token.');
      if(result.user?.role!=='driver')throw new Error('This account is not registered as a GloiGO driver.');
      setToken(result.access_token);
      await loadData(result.access_token);
    }catch(e){setToken(null);setUser(null);setProfile(null);setError(errText(e));}
    finally{setBusy(false);}
  };
  const register=async()=>{
    if(fullName.trim().length<2)return Alert.alert('Name required','Enter your full name.');
    if(!email.trim()||!password)return Alert.alert('Details required','Enter your email and password.');
    if(password.length<8)return Alert.alert('Password too short','Use at least 8 characters.');
    setBusy(true);setError('');
    try{
      await registerApi({full_name:fullName,email,password});
      setAuthMode('login');
      Alert.alert('Account created','Your driver account has been created. If email confirmation is enabled, verify your email first, then sign in. You will submit your driving licence number after signing in.');
    }catch(e){setError(errText(e));}
    finally{setBusy(false);}
  };
  const submitDriverApplication=async()=>{
    if(licenseNumber.trim().length<5)return Alert.alert('License number required','Enter a valid driving licence number.');
    setBusy(true);
    try{
      const result=await applyDriverApi(token,licenseNumber);
      setProfile({license_number:licenseNumber,verification_status:result.verification_status||'pending',is_online:false});
      Alert.alert('Application submitted','Your driver application is pending admin verification.');
    }catch(e){Alert.alert('Application failed',errText(e));}
    finally{setBusy(false);}
  };
  const logout=async()=>{stopWatch();setToken(null);setUser(null);setProfile(null);setVan(null);setBookings([]);setPage('Home');setEmail('');setPassword('');setAuthMode('login');};
  const refresh=async()=>{if(!token)return;setBusy(true);try{setBookings(await bookingsApi(token));}catch(e){Alert.alert('Refresh failed',errText(e));}finally{setBusy(false);}};
  const toggleOnline=async()=>{
    if(!token||!profile)return;
    if(profile.verification_status!=='approved')return Alert.alert('Verification required','You can go online after your driver verification is approved.');
    setBusy(true);
    try{
      if(!profile.is_online){
        const perm=await Location.requestForegroundPermissionsAsync();
        if(!perm.granted)throw new Error('Allow location permission to go online.');
        const pos=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});
        const {latitude,longitude,accuracy}=pos.coords;
        await availabilityApi(token,true);
        setCoords({latitude,longitude});
        try{await locationApi(token,latitude,longitude,accuracy||50);}catch(e){}
        setProfile(p=>({...p,is_online:true}));setVan(v=>v?({...v,is_online:true}):v);
      }else{
        await availabilityApi(token,false);setProfile(p=>({...p,is_online:false}));setVan(v=>v?({...v,is_online:false}):v);
        stopWatch();
      }
    }catch(e){Alert.alert('Availability not changed',errText(e));}
    finally{setBusy(false);}
  };
  const accept=async b=>{setBusy(true);try{await acceptApi(token,b.id);await refresh();setPage('Active');}catch(e){Alert.alert('Could not accept',errText(e));}finally{setBusy(false);}};
  const reject=b=>Alert.alert('Reject request?','This request will be removed from your queue.',[{text:'Cancel',style:'cancel'},{text:'Reject',style:'destructive',onPress:async()=>{setBusy(true);try{await rejectApi(token,b.id);setBookings(prev=>prev.filter(x=>x.id!==b.id));}catch(e){Alert.alert('Could not reject',errText(e));}finally{setBusy(false);}}}]);
  const updateStatus=async()=>{if(!active||!token)return;setBusy(true);try{await startApi(token,active.id);await refresh();}catch(e){Alert.alert('Update failed',errText(e));}finally{setBusy(false);}};
  const complete=()=>{if(!active)return;Alert.alert('Complete service?','Confirm that the washroom service or requested essentials have been provided.',[{text:'Cancel',style:'cancel'},{text:'Complete',onPress:async()=>{setBusy(true);try{await completeApi(token,active.id);await refresh();Alert.alert('Completed','Booking marked as completed.');}catch(e){Alert.alert('Could not complete',errText(e));}finally{setBusy(false);}}}]);};
  const bg={backgroundColor:colors.bg,flex:1};
  const txt={color:colors.text};
  const Header=({title,sub})=><View style={s.header}>
    <View style={s.brandMark}><MaterialCommunityIcons name="van-utility" size={23} color="#fff"/></View>
    <View style={{flex:1}}><Txt style={[s.brand,{color:colors.text}]}>Gloi<Text style={{color:C.pink}}>GO</Text> Driver</Txt><Txt style={{fontSize:10,color:colors.muted}}>{title}{sub?' · '+sub:''}</Txt></View>
    {!!token&&<TouchableOpacity onPress={()=>setPage('Profile')} style={s.avatar}><Ionicons name="person-outline" size={19} color={C.plum}/></TouchableOpacity>}
  </View>;
  const Nav=()=> <View style={[s.nav,{backgroundColor:colors.surface,borderTopColor:colors.line}]}>
    {[['Home','home-outline'],['Requests','list-outline'],['Active','navigate-outline'],['History','time-outline'],['Profile','person-outline']].map(([key,ic])=><TouchableOpacity key={key} onPress={()=>setPage(key)} style={s.navItem}>
      <Ionicons name={ic} size={20} color={page===key?C.pink:colors.muted}/><Text style={{fontSize:9,fontWeight:page===key?'900':'600',color:page===key?C.pink:colors.muted}}>{key}</Text>
    </TouchableOpacity>)}
  </View>;
  const scroll=(children)=><ScrollView contentContainerStyle={s.content} refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor={C.pink}/>}>{children}</ScrollView>;

  if(loading&&!token) return <SafeAreaView style={[bg,{justifyContent:'center',alignItems:'center'}]}><ActivityIndicator size="large" color={C.pink}/><Txt style={{marginTop:12,color:colors.text}}>Loading GloiGO Driver…</Txt></SafeAreaView>;

  if(!token) return <SafeAreaView style={[bg,{justifyContent:'center'}]}>
    <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView contentContainerStyle={{padding:24,justifyContent:'center',flexGrow:1}}>
        <View style={{alignItems:'center',marginBottom:28}}>
          <View style={[s.logoCircle,{backgroundColor:C.blush}]}><MaterialCommunityIcons name="van-utility" size={48} color={C.plum}/></View>
          <Txt style={[s.loginTitle,{color:colors.text}]}>GloiGO Driver</Txt>
          <Txt style={{color:colors.muted,fontSize:12}}>{authMode==='login'?'Sign in to your driver account':'Create your driver account'}</Txt>
        </View>
        {!!error&&<Card style={{backgroundColor:'#FCE9ED'}}><Txt style={{color:C.red,fontSize:12}}>{error}</Txt></Card>}
        <Card style={{backgroundColor:colors.surface,borderColor:colors.line}}>
          {authMode==='register'&&<Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name"/>}
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="driver@example.com" keyboardType="email-address"/>
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry/>
          <Button title={authMode==='login'?'Sign in':'Create account'} icon="arrow-forward" onPress={authMode==='login'?login:register} loading={busy}/>
          <TouchableOpacity onPress={()=>{setAuthMode(authMode==='login'?'register':'login');setError('');}} style={{padding:12,alignItems:'center'}}>
            <Txt style={{color:C.pink,fontWeight:'800'}}>{authMode==='login'?"New driver? Create account":"Already registered? Sign in"}</Txt>
          </TouchableOpacity>
        </Card>
        <Txt style={{textAlign:'center',fontSize:10,color:colors.muted,marginTop:16}}>Driver accounts are verified by the GloiGO admin before trips can be accepted.</Txt>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;

  if(token && !profile) return <SafeAreaView style={[bg,{justifyContent:'center'}]}>
    <ScrollView contentContainerStyle={{padding:24,justifyContent:'center',flexGrow:1}}>
      <Header title="Driver application" sub="Complete your profile"/>
      <Card style={{backgroundColor:colors.surface,borderColor:colors.line}}>
        <Txt style={{fontSize:18,fontWeight:'900',color:colors.text}}>Submit driver details</Txt>
        <Txt style={{fontSize:12,color:colors.muted,lineHeight:18}}>Your account is registered. Enter your driving licence number to submit your driver application for admin verification.</Txt>
        <Field label="Driving licence number" value={licenseNumber} onChangeText={setLicenseNumber} placeholder="Enter licence number"/>
        <Button title="Submit application" icon="checkmark" onPress={submitDriverApplication} loading={busy}/>
        <Button title="Sign out" secondary onPress={logout}/>
      </Card>
    </ScrollView>
  </SafeAreaView>;

  let body;
  if(page==='Home') body=scroll(<>
    <Header title="Dashboard" sub="Driver overview"/>
    <Card style={[s.hero,{backgroundColor:C.plum,borderColor:C.plum}]}>
      <Txt style={{color:'#F7DDE6',fontSize:11,fontWeight:'800'}}>WELCOME BACK</Txt>
      <Txt style={{color:'#fff',fontSize:23,fontWeight:'900',marginTop:5}}>{user?.full_name||'Driver'}</Txt>
      <Txt style={{color:'#F7DDE6',fontSize:12,marginTop:5}}>{van?.van_number||'Van not assigned'}</Txt>
      <View style={[s.between,{marginTop:18}]}>
        <View><Txt style={{color:'#F7DDE6',fontSize:10}}>DRIVER STATUS</Txt><Txt style={{color:'#fff',fontSize:17,fontWeight:'900'}}>{profile?.is_online?'ONLINE':'OFFLINE'}</Txt></View>
        <Switch value={!!profile?.is_online} onValueChange={toggleOnline} disabled={busy||profile?.verification_status!=='approved'} trackColor={{false:'#9B8292',true:'#76B99B'}} thumbColor="#fff"/>
      </View>
      {profile?.verification_status!=='approved'&&<Txt style={{color:'#FFE1E8',fontSize:11,marginTop:10}}>Online access unlocks after verification approval.</Txt>}
    </Card>
    <View style={s.stats}>
      <Card style={s.stat}><Txt style={s.statNum}>{pending.length}</Txt><Txt style={s.muted}>New requests</Txt></Card>
      <Card style={s.stat}><Txt style={s.statNum}>{active?1:0}</Txt><Txt style={s.muted}>Active trip</Txt></Card>
      <Card style={s.stat}><Txt style={s.statNum}>{history.length}</Txt><Txt style={s.muted}>Completed</Txt></Card>
    </View>
    <Card style={{backgroundColor:colors.surface,borderColor:colors.line}}>
      <Txt style={[s.cardTitle,txt]}>Driver verification</Txt><StatusPill status={profile?.verification_status}/>
      {!!profile?.rejection_reason&&<Txt style={{color:C.red,fontSize:12,marginTop:9}}>{profile.rejection_reason}</Txt>}
      <Txt style={s.muted}>Rating: {profile?.average_rating??'—'} · Reviews: {profile?.total_ratings_count??0}</Txt>
    </Card>
    <Txt style={[s.section,txt]}>Latest requests</Txt>
    {pending.slice(0,2).map(b=><BookingCard key={b.id} b={b} onAccept={accept} onReject={reject} working={busy}/>)}
    {!pending.length&&<Card><Txt style={{color:colors.muted,textAlign:'center'}}>No new requests assigned to your van.</Txt></Card>}
  </>);
  else if(page==='Requests') body=scroll(<><Header title="Booking requests" sub={`${pending.length} pending`}/>{pending.length?pending.map(b=><BookingCard key={b.id} b={b} onAccept={accept} onReject={reject} working={busy}/>):<Card><Txt style={{textAlign:'center',color:colors.muted}}>No pending booking requests.</Txt></Card>}</>);
  else if(page==='Active') body=scroll(<><Header title="Active trip"/>{active?<Card style={{backgroundColor:colors.surface,borderColor:colors.line}}>
    <View style={s.between}><Txt style={s.cardTitle}>Booking #{String(active.id).slice(-8)}</Txt><StatusPill status={active.status}/></View>
    <Txt style={s.label}>CUSTOMER</Txt><Txt style={s.body}>{active.customer_name||'Customer'}</Txt>
    <Txt style={s.label}>PICKUP ADDRESS</Txt><Txt style={s.body}>{active.pickup_address}</Txt>
    <Txt style={s.label}>CONTACT</Txt><TouchableOpacity onPress={()=>active.mobile_number&&Linking.openURL(`tel:${active.mobile_number}`)}><Txt style={[s.body,{color:C.pink}]}>{active.mobile_number||'Unavailable'} · Call customer</Txt></TouchableOpacity>
    <Txt style={s.label}>REQUESTED ITEMS</Txt><Txt style={s.body}>{active.pads_requested?`Sanitary pads × ${active.pads_quantity||1}; `:''}{Array.isArray(active.hygiene_items)?active.hygiene_items.join(', '):active.hygiene_items||'Mobile washroom service'}</Txt>
    {!!active.customer_notes&&<Txt style={s.note}>Customer note: {active.customer_notes}</Txt>}
    <View style={s.progress}><View style={[s.progressBar,{backgroundColor:C.pink}]}/><View style={[s.progressBar,{backgroundColor:['arriving','in_progress'].includes(active.status)?C.pink:colors.line}]}/><View style={[s.progressBar,{backgroundColor:active.status==='in_progress'?C.pink:colors.line}]}/></View>
    {active.status==='accepted'&&<Button title="Start service" icon="play" onPress={updateStatus} loading={busy}/>}
    {active.status==='in_progress'&&<Button title="Complete service" icon="checkmark-done" onPress={complete} loading={busy}/>}
  </Card>:<Card><Txt style={{textAlign:'center',color:colors.muted}}>You do not have an active trip.</Txt></Card>}</>);
  else if(page==='History') body=scroll(<><Header title="Booking history" sub={`${history.length} records`}/>{history.length?history.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).map(b=><Card key={b.id}><View style={s.between}><Txt style={{fontWeight:'900'}}>#{String(b.id).slice(-8)}</Txt><StatusPill status={b.status}/></View><Txt style={s.body}>{b.pickup_address}</Txt><Txt style={s.muted}>{fmt(b.created_at)} · ₹{b.fare??'—'}</Txt>{b.customer_rating!=null&&<Txt style={{color:'#B17A00',fontWeight:'800',marginTop:7}}>★ {b.customer_rating}/5 · {b.customer_review||'Customer rating'}</Txt>}</Card>):<Card><Txt style={{textAlign:'center',color:colors.muted}}>Completed and cancelled trips will appear here.</Txt></Card>}</>);
  else if(page==='Profile') body=scroll(<><Header title="Driver profile"/><Card style={{alignItems:'center',backgroundColor:colors.surface,borderColor:colors.line}}><View style={s.profileIcon}><Ionicons name="person" size={28} color={C.plum}/></View><Txt style={[s.cardTitle,txt]}>{user?.full_name||'Driver'}</Txt><Txt style={s.muted}>{user?.email}</Txt><Txt style={s.muted}>{user?.phone||'Phone not listed'}</Txt></Card><Card style={{backgroundColor:colors.surface,borderColor:colors.line}}><Txt style={s.label}>LICENSE NUMBER</Txt><Txt style={s.body}>{profile?.license_number||'—'}</Txt><Txt style={s.label}>VERIFICATION</Txt><StatusPill status={profile?.verification_status}/><Txt style={s.label}>ASSIGNED VAN</Txt><Txt style={s.body}>{van?.van_number||'Not assigned'} · {van?.van_status||'—'}</Txt><Txt style={s.label}>LOCATION TRACKING</Txt><Txt style={s.body}>{tracking?'Active':profile?.is_online?'Waiting for GPS':'Off'}</Txt></Card><Button title="Settings" secondary icon="settings-outline" onPress={()=>setPage('Settings')}/><Button title="Sign out" danger icon="log-out-outline" onPress={()=>Alert.alert('Sign out','Sign out from GloiGO Driver?',[{text:'Cancel',style:'cancel'},{text:'Sign out',style:'destructive',onPress:logout}])}/></>);
  else body=scroll(<><Header title="Settings"/><Card style={{backgroundColor:colors.surface,borderColor:colors.line}}><Txt style={s.cardTitle}>Appearance</Txt><View style={s.between}><Txt style={s.body}>Dark mode</Txt><Switch value={dark} onValueChange={v=>setTheme(v?'dark':'light')}/></View></Card><Button title="Back to dashboard" secondary onPress={()=>setPage('Home')}/></>);
  return <SafeAreaView style={[bg]}><View style={{flex:1}}>{body}</View><Nav/></SafeAreaView>;
}

const s=StyleSheet.create({
  content:{padding:17,paddingBottom:30,gap:13},header:{flexDirection:'row',alignItems:'center',gap:11,marginBottom:5},
  brandMark:{width:43,height:43,borderRadius:14,backgroundColor:C.pink,alignItems:'center',justifyContent:'center'},
  brand:{fontSize:17,fontWeight:'900'},avatar:{width:39,height:39,borderRadius:20,backgroundColor:C.blush,alignItems:'center',justifyContent:'center'},
  card:{backgroundColor:C.white,borderColor:C.line,borderWidth:1,borderRadius:19,padding:15,gap:9},
  hero:{padding:19,borderRadius:23},between:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:8},
  stats:{flexDirection:'row',gap:8},stat:{flex:1,alignItems:'center',paddingVertical:14,paddingHorizontal:5},
  statNum:{fontSize:24,fontWeight:'900',color:C.pink},muted:{fontSize:11,color:C.muted,lineHeight:17},
  section:{fontSize:16,fontWeight:'900',marginTop:3},cardTitle:{fontSize:15,fontWeight:'900'},
  label:{fontSize:10,fontWeight:'900',color:C.muted,letterSpacing:.6,marginTop:4},input:{borderWidth:1,borderColor:C.line,backgroundColor:'#FFFCFD',borderRadius:12,paddingHorizontal:13,paddingVertical:12,color:C.ink,fontSize:14},
  btn:{minHeight:45,borderRadius:13,borderWidth:1,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,paddingHorizontal:13,marginTop:3},
  pill:{alignSelf:'flex-start',paddingHorizontal:9,paddingVertical:5,borderRadius:20,flexDirection:'row',alignItems:'center',gap:5},
  dot:{width:6,height:6,borderRadius:3},detail:{flexDirection:'row',alignItems:'flex-start',gap:8},note:{fontSize:11,color:C.plum,backgroundColor:C.blush+'66',padding:10,borderRadius:10,lineHeight:16},
  actions:{flexDirection:'row',gap:8},body:{fontSize:13,lineHeight:20},progress:{flexDirection:'row',gap:6,marginVertical:9},progressBar:{height:6,flex:1,borderRadius:5},
  nav:{height:62,borderTopWidth:1,flexDirection:'row',paddingBottom:4},navItem:{flex:1,alignItems:'center',justifyContent:'center',gap:3},
  logoCircle:{width:88,height:88,borderRadius:28,alignItems:'center',justifyContent:'center',marginBottom:15},loginTitle:{fontSize:25,fontWeight:'900',marginBottom:4},
  profileIcon:{width:66,height:66,borderRadius:23,backgroundColor:C.blush,alignItems:'center',justifyContent:'center',marginBottom:7}
});
