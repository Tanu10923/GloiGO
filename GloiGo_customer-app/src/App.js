import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert, Animated, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StatusBar,
  StyleSheet, Switch, Text, TextInput, TouchableOpacity, View, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { palette, themes } from './theme';



const ThemeContext = createContext(null);
const DataContext = createContext(null);
const THEME_KEY = 'gloigo-theme-v2';

function ThemeProvider({ children }) {
  const [mode, setMode] = useState('light');
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(saved => { if (saved === 'dark' || saved === 'light') setMode(saved); })
      .finally(() => setLoaded(true));
  }, []);
  const updateMode = async next => {
    setMode(next);
    try { await AsyncStorage.setItem(THEME_KEY, next); } catch (_) {}
  };
  const value = useMemo(() => ({ mode, setMode: updateMode, c: themes[mode] }), [mode]);
  if (!loaded) return <View style={{ flex: 1, backgroundColor: palette.ivory }} />;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
const useTheme = () => useContext(ThemeContext);
const useData = () => useContext(DataContext);

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '');
const AUTH_TOKEN_KEY = 'gloigo-auth-access-token';

async function apiFetch(path, options = {}, accessToken = null) {
  if (!API_BASE_URL) {
    throw new Error('Backend URL is not configured. Set EXPO_PUBLIC_API_BASE_URL in .env.');
  }
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch (_) { data = { detail: raw }; }
  if (!response.ok) {
    const message = data.detail || data.message || `Request failed (${response.status})`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data;
}

function DataProvider({ children }) {
  const [bookings, setBookings] = useState([]);
  const [profile, setProfile] = useState({ name: '', phone: '', email: '' });
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadBookings = async (activeToken = token) => {
    if (!activeToken) { setBookings([]); return []; }
    const data = await apiFetch('/bookings/my', { method: 'GET' }, activeToken);
    const rows = Array.isArray(data.bookings) ? data.bookings : [];
    setBookings(rows);
    return rows;
  };

  const loadProfile = async (activeToken) => {
    const data = await apiFetch('/auth/me', { method: 'GET' }, activeToken);
    const next = {
      name: data.full_name || data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      id: data.id,
      role: data.role,
    };
    setProfile(next);
    return next;
  };

  useEffect(() => {
    (async () => {
      try {
        const savedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (savedToken) {
          try {
            await loadProfile(savedToken);
            setToken(savedToken);
            await loadBookings(savedToken);
          } catch (error) {
            await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
            setToken(null);
            setBookings([]);
          }
        }
      } catch (_) {
        // Session will start signed out if storage cannot be read.
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), password }),
    });
    if (!data.access_token) throw new Error('Backend did not return an access token.');
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setProfile({
      name: data.user?.full_name || email.split('@')[0],
      email: data.user?.email || email,
      phone: data.user?.phone || '',
      id: data.user?.id,
      role: data.user?.role,
    });
    await loadBookings(data.access_token);
    return data;
  };

  const register = async ({ name, email, password }) => {
    return apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        full_name: name.trim(),
        email: email.trim(),
        password,
        role: 'customer',
      }),
    });
  };

  const logout = async () => {
    await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    setToken(null);
    setBookings([]);
    setProfile({ name: '', phone: '', email: '' });
  };

  const addBooking = async (payload) => {
    if (!token) throw new Error('Please sign in before booking.');
    const data = await apiFetch('/bookings/', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
    const created = data.booking || data;
    await loadBookings(token);
    return created;
  };

  const value = useMemo(() => ({
    bookings, loadBookings, addBooking, profile, setProfile,
    token, authLoading, login, register, logout,
  }), [bookings, profile, token, authLoading]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function T({ children, style, ...props }) {
  const { c } = useTheme();
  return <Text {...props} style={[{ color: c.text }, style]}>{children}</Text>;
}
function Card({ children, style }) {
  const { c } = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
}
function PrimaryButton({ title, onPress, icon, secondary = false, disabled = false, compact = false, style }) {
  const { c } = useTheme();
  const bg = secondary ? c.surfaceAlt : c.primary;
  const fg = secondary ? c.text : c.primaryText;
  return (
    <TouchableOpacity activeOpacity={0.82} disabled={disabled} onPress={onPress}
      style={[styles.button, compact && { minHeight: 42, paddingHorizontal: 14 }, { backgroundColor: bg, borderColor: c.border, opacity: disabled ? 0.5 : 1 }, style]}>
      {icon ? <Ionicons name={icon} size={17} color={fg} /> : null}
      <Text style={{ color: fg, fontSize: 13, fontWeight: '800' }}>{title}</Text>
    </TouchableOpacity>
  );
}
function Header({ title, subtitle, onProfile, showBack, onBack, onRefresh }) {
  const { c } = useTheme();
  return (
    <View style={styles.header}>
      {showBack ? <TouchableOpacity onPress={onBack} style={[styles.backButton, { backgroundColor: c.surface, borderColor: c.border }]}><Ionicons name="arrow-back" size={20} color={c.text} /></TouchableOpacity> : null}
      <Image
        source={require('../assets/gloigo-logo.png')}
        style={styles.headerLogo}
        resizeMode="contain"
        accessibilityLabel="GloiGO logo"
      />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T style={styles.headerTitle}>{title}</T>
        {!!subtitle && <T numberOfLines={2} style={[styles.headerSubtitle, { color: c.muted }]}>{subtitle}</T>}
      </View>
      {onRefresh ? <TouchableOpacity onPress={onRefresh} activeOpacity={0.75} style={[styles.backButton, { backgroundColor: c.surface, borderColor: c.border, marginRight: 8, marginLeft: 0 }]} accessibilityLabel="Replay GloiGO van intro">
        <Ionicons name="refresh" size={19} color={c.primary} />
      </TouchableOpacity> : null}
      <TouchableOpacity onPress={onProfile} activeOpacity={0.8} style={[styles.profileButton, { backgroundColor: c.accent, borderColor: c.border }]}>
        <Ionicons name="person-outline" size={20} color={c.mode === 'dark' ? c.text : palette.plum} />
      </TouchableOpacity>
    </View>
  );
}
function SectionHeading({ title, action, onAction }) {
  const { c } = useTheme();
  return <View style={styles.sectionHeading}>
    <T style={styles.sectionTitle}>{title}</T>
    {action ? <TouchableOpacity onPress={onAction}><Text style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>{action}</Text></TouchableOpacity> : null}
  </View>;
}
function IconTile({ icon, color, bg, size = 22 }) {
  return <View style={[styles.iconTile, { backgroundColor: bg || palette.blush }]}><MaterialCommunityIcons name={icon} size={size} color={color || palette.plum} /></View>;
}
function ServiceTile({ icon, title, subtitle, onPress }) {
  const { c } = useTheme();
  return <TouchableOpacity onPress={onPress} activeOpacity={0.82} style={{ width: '48%' }}>
    <Card style={styles.serviceTile}>
      <IconTile icon={icon} color={c.mode === 'dark' ? c.text : palette.plum} bg={c.accent} />
      <T style={styles.serviceTitle}>{title}</T>
      <T style={[styles.serviceSubtitle, { color: c.muted }]}>{subtitle}</T>
      <View style={styles.tileArrow}><Ionicons name="arrow-forward" size={15} color={c.muted} /></View>
    </Card>
  </TouchableOpacity>;
}
function HomeScreen({ navigate, onRefresh }) {
  const { c } = useTheme();
  const { profile, bookings } = useData();
  const active = bookings.find(b => ['Pending', 'Accepted', 'On the way'].includes(b.status));
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <Header title={`Hello, ${profile.name.split(' ')[0] || 'there'}`} subtitle="A little care, wherever you are." onProfile={() => navigate('Profile')} onRefresh={onRefresh} />
      <View style={[styles.hero, { backgroundColor: c.primary }]}>
        <View style={[styles.heroOrb, { backgroundColor: c.mode === 'dark' ? '#222222' : '#6A4359' }]}>
          <Ionicons name="heart-outline" size={22} color={c.primaryText} />
        </View>
        <T style={[styles.heroTitle, { color: c.primaryText }]}>Care when you need it.</T>
        <T style={[styles.heroText, { color: c.mode === 'dark' ? '#D7D7D7' : '#F6EDEF' }]}>Find a nearby washroom or request private mobile assistance.</T>
        <PrimaryButton title="Request assistance" icon="arrow-forward" onPress={() => navigate('Book')} style={{ alignSelf: 'flex-start', marginTop: 18, backgroundColor: c.mode === 'dark' ? palette.white : palette.blush }} />
        <View style={styles.heroDecorOne} /><View style={styles.heroDecorTwo} />
      </View>
      {active ? <TouchableOpacity onPress={() => navigate('Bookings')} activeOpacity={0.8}>
        <Card style={styles.activeCard}>
          <IconTile icon="van-utility" bg={c.accent} color={c.text} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <T style={{ fontWeight: '800', fontSize: 13 }}>Your assistance request</T>
            <T style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>{active.status} · Tap to view</T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.muted} />
        </Card>
      </TouchableOpacity> : null}
      <SectionHeading title="What do you need?" />
      <View style={styles.tileGrid}>
        <ServiceTile icon="map-marker-radius-outline" title=" Access facilities" subtitle="Explore nearby facilities" onPress={() => navigate('Explore')} />
        <ServiceTile icon="van-utility" title="Book a GloiGO van" subtitle="Private mobile washroom" onPress={() => navigate('Book', 'van')} />
        <ServiceTile icon="package-variant-closed" title="Sanitary pads" subtitle="Request hygiene essentials" onPress={() => navigate('Book', 'pads')} />
        <ServiceTile icon="hand-heart-outline" title="Hygiene kit" subtitle="Tissues and essentials" onPress={() => navigate('Book', 'kit')} />
      </View>
      <SectionHeading title="Simple, thoughtful assistance" />
      <Card style={{ padding: 16 }}>
        {[
          ['1', 'Choose what you need', 'Discover a facility or request a mobile washroom.'],
          ['2', 'Share your location', 'Set a pickup point and check service availability.'],
          ['3', 'Get assistance', 'Follow booking updates and meet your assigned driver.'],
        ].map((item, index) => <View key={item[0]} style={[styles.stepRow, index < 2 && { borderBottomWidth: 1, borderBottomColor: c.border }]}>
          <View style={[styles.stepNumber, { backgroundColor: c.accent }]}><T style={{ fontWeight: '900' }}>{item[0]}</T></View>
          <View style={{ flex: 1 }}>
            <T style={{ fontWeight: '800', fontSize: 13 }}>{item[1]}</T>
            <T style={{ color: c.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>{item[2]}</T>
          </View>
        </View>)}
      </Card>
      <T style={{ color: c.muted, fontSize: 10, textAlign: 'center', marginTop: 2 }}>Service availability depends on local coverage and operations.</T>
    </ScrollView>
  );
}

function MapIllustration() {
  const { c } = useTheme();
  return (
    <View style={[styles.mapPanel, { backgroundColor: c.map, borderColor: c.border }]}>
      <View style={[styles.road, styles.roadA, { backgroundColor: c.mapLine }]} />
      <View style={[styles.road, styles.roadB, { backgroundColor: c.mapLine }]} />
      <View style={[styles.road, styles.roadC, { backgroundColor: c.mapLine }]} />
      <View style={[styles.road, styles.roadD, { backgroundColor: c.mapLine }]} />
      <View style={[styles.mapPin, { top: 35, left: '20%', backgroundColor: palette.plum }]}><Ionicons name="woman-outline" size={15} color="#FFFFFF" /></View>
      <View style={[styles.mapPin, { top: 93, right: '22%', backgroundColor: palette.sage }]}><Ionicons name="location" size={15} color="#FFFFFF" /></View>
      <View style={[styles.mapPin, { bottom: 25, left: '48%', backgroundColor: palette.plum }]}><MaterialCommunityIcons name="toilet" size={15} color="#FFFFFF" /></View>
      <View style={[styles.mapCurrent, { backgroundColor: c.surface, borderColor: c.primary }]}><View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.primary }} /></View>
      <View style={[styles.mapLabel, { backgroundColor: c.surface }]}><T style={{ fontSize: 10, fontWeight: '800' }}>Your area</T></View>
    </View>
  );
}
function ExploreScreen({ navigate }) {
  const { c } = useTheme();
  return <ScrollView contentContainerStyle={styles.screenContent}>
    <Header title="Explore nearby" subtitle="Find washroom support around you." onProfile={() => navigate('Profile')} />
    <MapIllustration />
    <Card style={{ padding: 16 }}>
      <T style={{ fontSize: 16, fontWeight: '900' }}>Find a suitable facility</T>
      <T style={{ color: c.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>This preview shows the map experience. Verified nearby washroom listings and live availability will appear after a facilities data source is connected.</T>
      <PrimaryButton title="Use my current location" icon="navigate-outline" onPress={() => Alert.alert('Location', 'Location access is requested when the booking form is opened.')} secondary style={{ marginTop: 14 }} />
    </Card>
    <Card style={{ padding: 16 }}>
      <View style={styles.inlineRow}>
        <IconTile icon="shield-check-outline" bg={c.accent} color={c.text} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <T style={{ fontWeight: '800' }}>Choose with confidence</T>
          <T style={{ color: c.muted, fontSize: 11, marginTop: 3 }}>Facility details should be verified before launch.</T>
        </View>
      </View>
    </Card>
    <PrimaryButton title="Request a mobile washroom" icon="arrow-forward" onPress={() => navigate('Book', 'van')} />
  </ScrollView>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }) {
  const { c } = useTheme();
  return <View style={{ marginBottom: 13 }}>
    <T style={styles.fieldLabel}>{label}</T>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor={c.muted} keyboardType={keyboardType} multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      style={[styles.input, { backgroundColor: c.input, borderColor: c.border, color: c.text, height: multiline ? 84 : 48 }]} />
  </View>;
}
function Choice({ label, selected, onPress }) {
  const { c } = useTheme();
  return <TouchableOpacity onPress={onPress} style={[styles.choice, { backgroundColor: selected ? c.surfaceAlt : c.surface, borderColor: selected ? c.primary : c.border }]}>
    <Ionicons name={selected ? 'checkbox' : 'square-outline'} size={20} color={c.primary} />
    <T style={{ fontWeight: '700', fontSize: 13, flex: 1 }}>{label}</T>
  </TouchableOpacity>;
}
function BookScreen({ navigate, preset }) {
  const { c } = useTheme();
  const { addBooking, profile } = useData();
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(profile.phone || '');
  const [notes, setNotes] = useState('');
  const [pads, setPads] = useState(preset === 'pads');
  const [tissues, setTissues] = useState(preset === 'kit');
  const [sanitizer, setSanitizer] = useState(preset === 'kit');
  const [qty, setQty] = useState('1');
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [successBooking, setSuccessBooking] = useState(null);
  const getLocation = async () => {
    setLoading(true); setLocationMessage('');
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) { setLocationMessage('Permission not granted. Please enter your location manually.'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const result = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const p = result?.[0];
      setAddress([p?.name, p?.street, p?.district, p?.city, p?.region].filter(Boolean).join(', ') || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      setLocationMessage('Current location added.');
    } catch (_) { setLocationMessage('Could not detect location. Enter your pickup address manually.'); }
    finally { setLoading(false); }
  };
  const submit = async () => {
    if (address.trim().length < 5) return Alert.alert('Pickup location required', 'Enter an address or use your current location.');
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) return Alert.alert('Check mobile number', 'Enter a valid 10-digit Indian mobile number.');
    const payload = {
      pickup_address: address.trim(),
      mobile_number: cleanPhone,
      pickup_latitude: coords?.latitude ?? null,
      pickup_longitude: coords?.longitude ?? null,
      pads_requested: pads,
      pads_quantity: pads ? Math.max(1, Math.min(20, parseInt(qty, 10) || 1)) : 0,
      hygiene_items: [tissues ? 'Tissues' : null, sanitizer ? 'Hand sanitizer' : null].filter(Boolean),
      notes: notes.trim() || null,
    };
    setLoading(true);
    try {
      const created = await addBooking(payload);
      setSuccessBooking(created);
      setNotes('');
    } catch (e) {
      Alert.alert('Could not submit', e.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
        <Header title="Request assistance" subtitle="A few details help us coordinate your request." onProfile={() => navigate('Profile')} />
        <Card style={{ padding: 16 }}>
          <T style={styles.cardTitle}>Where should we meet you?</T>
          <Field label="Pickup address or landmark" value={address} onChangeText={setAddress} placeholder="Enter your location" multiline />
          <PrimaryButton title={loading ? 'Please wait…' : 'Use current location'} icon="navigate-outline" secondary compact onPress={getLocation} disabled={loading} style={{ alignSelf: 'flex-start' }} />
          {!!locationMessage && <T style={{ color: c.muted, fontSize: 11, marginTop: 8 }}>{locationMessage}</T>}
        </Card>
        <Card style={{ padding: 16 }}>
          <T style={styles.cardTitle}>Hygiene essentials</T>
          <Choice label="Sanitary pads" selected={pads} onPress={() => setPads(!pads)} />
          {pads ? <Field label="Quantity" value={qty} onChangeText={setQty} placeholder="1" keyboardType="number-pad" /> : null}
          <Choice label="Tissues" selected={tissues} onPress={() => setTissues(!tissues)} />
          <Choice label="Hand sanitizer" selected={sanitizer} onPress={() => setSanitizer(!sanitizer)} />
        </Card>
        <Card style={{ padding: 16 }}>
          <T style={styles.cardTitle}>Contact details</T>
          <Field label="Mobile number" value={phone} onChangeText={setPhone} placeholder="10-digit mobile number" keyboardType="phone-pad" />
          <Field label="Additional notes (optional)" value={notes} onChangeText={setNotes} placeholder="Any landmark or special instructions..." multiline />
        </Card>
        <PrimaryButton title={loading ? 'Submitting…' : 'Submit request'} icon="arrow-forward" onPress={submit} disabled={loading} />
        <T style={{ color: c.muted, fontSize: 10, textAlign: 'center' }}>A submitted demo request does not guarantee van availability or emergency response.</T>
      </ScrollView>
      <Modal visible={!!successBooking} transparent animationType="fade" onRequestClose={() => setSuccessBooking(null)}>
        <View style={styles.celebrationBackdrop}>
          <View style={[styles.celebrationCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <FlowerCelebration />
            <T style={{ color: palette.plum, fontSize: 10, fontWeight: '900', letterSpacing: 2 }}>A LITTLE CARE IS ON ITS WAY</T>
            <T style={{ fontSize: 21, fontWeight: '900', textAlign: 'center' }}>Your request was submitted!</T>
            <T style={{ color: c.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' }}>Thank you for choosing GloiGO. Your request has been sent to GloiGO. You can view server-confirmed updates in My Bookings.</T>
            {!!successBooking?.id && <View style={[styles.successId, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}><T style={{ fontSize: 11, fontWeight: '900' }}>BOOKING ID · {successBooking.id}</T></View>}
            <PrimaryButton title="View my bookings" icon="arrow-forward" onPress={() => { setSuccessBooking(null); navigate('Bookings'); }} style={{ width: '100%' }} />
            <TouchableOpacity onPress={() => setSuccessBooking(null)} style={{ paddingVertical: 5 }}><T style={{ color: c.muted, fontSize: 11, fontWeight: '700' }}>Close</T></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

function BookingsScreen({ navigate }) {
  const { c } = useTheme();
  const { bookings, loadBookings } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    setRefreshing(true);
    setError('');
    try { await loadBookings(); }
    catch (e) { setError(e.message || 'Unable to load bookings from server.'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { refresh(); }, []);

  return <ScrollView contentContainerStyle={styles.screenContent}>
    <Header title="My bookings" subtitle="Your requests from the GloiGO server." onProfile={() => navigate('Profile')} />
    <PrimaryButton title={refreshing ? 'Refreshing…' : 'Refresh bookings'} icon="refresh" secondary compact onPress={refresh} disabled={refreshing} />
    {!!error && <Card style={{ padding: 13 }}><T style={{ color: '#C0395A', fontSize: 11 }}>{error}</T></Card>}
    {!bookings.length ? <Card style={{ padding: 25, alignItems: 'center' }}>
      <IconTile icon="clipboard-text-outline" bg={c.accent} color={c.text} size={27} />
      <T style={{ fontWeight: '900', fontSize: 17, marginTop: 14 }}>Nothing here yet</T>
      <T style={{ color: c.muted, textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 6 }}>Bookings returned by your backend will appear here.</T>
      <PrimaryButton title="Request assistance" onPress={() => navigate('Book')} style={{ marginTop: 17 }} />
    </Card> : bookings.map(b => <Card key={b.id} style={{ padding: 16 }}>
      <View style={styles.rowBetween}>
        <T style={{ fontWeight: '900' }}>#{b.id}</T>
        <View style={[styles.statusBadge, { backgroundColor: c.accent }]}><T style={{ fontSize: 10, fontWeight: '900' }}>{String(b.status || 'pending').replace(/_/g, ' ')}</T></View>
      </View>
      <T style={{ color: c.muted, fontSize: 11, marginTop: 12 }}>PICKUP LOCATION</T>
      <T style={{ fontWeight: '700', marginTop: 4, lineHeight: 19 }}>{b.pickup_address}</T>
      <T style={{ color: c.muted, fontSize: 10, marginTop: 9 }}>{b.created_at ? new Date(b.created_at).toLocaleString() : 'Date unavailable'}</T>
      {(b.pads_requested || b.hygiene_items?.length) ? <T style={{ fontSize: 11, marginTop: 10 }}>Items: {b.pads_requested ? `Pads × ${b.pads_quantity} ` : ''}{b.hygiene_items?.join(', ')}</T> : null}
      {!!b.notes && <T style={{ fontSize: 11, lineHeight: 17, marginTop: 9 }}>Notes: {b.notes}</T>}
      {b.total_amount != null ? <T style={{ fontSize: 12, fontWeight: '900', marginTop: 9 }}>Amount: ₹{b.total_amount}</T> : null}
    </Card>)}
  </ScrollView>;
}

function ProfileScreen({ navigate, onLogout }) {
  const { c } = useTheme();
  const { profile } = useData();
  return <ScrollView contentContainerStyle={styles.screenContent}>
    <Header title="Your profile" subtitle="Your account details from GloiGO." onProfile={() => {}} />
    <Card style={{ padding: 18 }}>
      <View style={[styles.profileLarge, { backgroundColor: c.accent }]}><Ionicons name="person-outline" size={31} color={c.text} /></View>
      <T style={{ fontSize: 17, fontWeight: '900', textAlign: 'center' }}>{profile.name || 'GloiGO Customer'}</T>
      <T style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 5 }}>{profile.email}</T>
      {!!profile.phone && <T style={{ color: c.muted, fontSize: 12, textAlign: 'center', marginTop: 4 }}>{profile.phone}</T>}
      <View style={[styles.themePreview, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        <T style={{ fontSize: 10, color: c.muted }}>ACCOUNT ROLE</T>
        <T style={{ fontWeight: '800', marginTop: 4 }}>{profile.role || 'customer'}</T>
      </View>
    </Card>
    <TouchableOpacity onPress={() => navigate('Settings')} activeOpacity={0.8}>
      <Card style={styles.menuCard}>
        <View style={styles.inlineRow}><IconTile icon="cog-outline" bg={c.accent} color={c.text} /><View style={{ flex: 1, marginLeft: 12 }}><T style={{ fontWeight: '800' }}>App settings</T><T style={{ color: c.muted, fontSize: 11, marginTop: 3 }}>Appearance and preferences</T></View><Ionicons name="chevron-forward" size={18} color={c.muted} /></View>
      </Card>
    </TouchableOpacity>
    <PrimaryButton title="Sign out" icon="log-out-outline" secondary onPress={() => Alert.alert('Sign out', 'Are you sure you want to sign out?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', style: 'destructive', onPress: onLogout }])} />
  </ScrollView>;
}

function SettingsScreen({ navigate }) {
  const { mode, setMode, c } = useTheme();
  const names = ['Soft Blush', 'Warm Ivory', 'Deep Plum', 'Sage Green', 'Charcoal'];
  const values = [palette.blush, palette.ivory, palette.plum, palette.sage, palette.charcoal];
  return <ScrollView contentContainerStyle={styles.screenContent}>
    <Header title="Settings" subtitle="A look and feel that suits you." onProfile={() => navigate('Profile')} showBack onBack={() => navigate('Profile')} />
    <Card style={{ padding: 17 }}>
      <View style={styles.rowBetween}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <T style={{ fontWeight: '900', fontSize: 14 }}>Dark appearance</T>
          <T style={{ color: c.muted, fontSize: 11, marginTop: 4 }}>Pure black surfaces and white text.</T>
        </View>
        <Switch value={mode === 'dark'} onValueChange={v => setMode(v ? 'dark' : 'light')} trackColor={{ false: c.border, true: palette.sage }} thumbColor={palette.white} />
      </View>
      <View style={[styles.themePreview, { backgroundColor: c.background, borderColor: c.border }]}>
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.primary }} />
          <T style={{ fontWeight: '800', fontSize: 11 }}>{mode === 'dark' ? 'Dark · Black & white' : 'Light · Warm white'}</T>
        </View>
      </View>
    </Card>
    <Card style={{ padding: 17 }}>
      <T style={{ fontWeight: '900', fontSize: 14 }}>GloiGO brand palette</T>
      {values.map((value, index) => <View key={value} style={styles.paletteRow}>
        <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: value, borderWidth: 1, borderColor: c.border }} />
        <View style={{ flex: 1, marginLeft: 11 }}><T style={{ fontWeight: '700', fontSize: 12 }}>{names[index]}</T><T style={{ color: c.muted, fontSize: 10, marginTop: 2 }}>{value}</T></View>
      </View>)}
    </Card>
    <Card style={{ padding: 17 }}>
      <T style={{ fontWeight: '900' }}>About GloiGO</T>
      <T style={{ color: c.muted, fontSize: 12, lineHeight: 19, marginTop: 7 }}>A women-focused washroom discovery and hygiene assistance concept. Actual service availability depends on local coverage and operations.</T>
      <T style={{ color: c.muted, fontSize: 10, marginTop: 12 }}>Customer app prototype · v1.1.0</T>
    </Card>
  </ScrollView>;
}

function BottomNavigation({ active, navigate }) {
  const { c } = useTheme();
  const tabs = [
    { key: 'Home', label: 'Home', icon: 'home-outline', activeIcon: 'home' },
    { key: 'Book', label: 'Book Van', icon: 'add-circle-outline', activeIcon: 'add-circle' },
    { key: 'Bookings', label: 'My Bookings', icon: 'receipt-outline', activeIcon: 'receipt' },
    { key: 'Profile', label: 'Profile', icon: 'person-outline', activeIcon: 'person' },
  ];
  return <View style={[styles.bottomNav, { backgroundColor: c.tab, borderTopColor: c.border }]}>
    {tabs.map(tab => {
      const selected = active === tab.key;
      return <TouchableOpacity key={tab.key} onPress={() => navigate(tab.key)} style={styles.navItem} activeOpacity={0.75}>
        <Ionicons name={selected ? tab.activeIcon : tab.icon} size={21} color={selected ? c.primary : c.muted} />
        <Text style={{ color: selected ? c.primary : c.muted, fontSize: 10, fontWeight: selected ? '900' : '600', marginTop: 3 }}>{tab.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}
function FlowerCelebration() {
  const bloom = React.useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(bloom, { toValue: 1, friction: 4, tension: 55, useNativeDriver: true }).start();
  }, [bloom]);
  const scale = bloom.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
  return <Animated.View style={{ transform: [{ scale }], width: 150, height: 112, alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>
    <Text style={{ fontSize: 52 }}>🌸</Text>
    <View style={{ position: 'absolute', top: 2, left: 13 }}><Text style={{ fontSize: 24 }}>🌼</Text></View>
    <View style={{ position: 'absolute', top: 0, right: 12 }}><Text style={{ fontSize: 23 }}>🌷</Text></View>
    <View style={{ position: 'absolute', bottom: 0, left: 36 }}><Text style={{ fontSize: 18 }}>✨</Text></View>
    <View style={{ position: 'absolute', bottom: 0, right: 31 }}><Text style={{ fontSize: 18 }}>🌿</Text></View>
  </Animated.View>;
}

function VanIntro({ onDone }) {
  const { c } = useTheme();
  const drive = React.useRef(new Animated.Value(0)).current;
  const fade = React.useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(drive, { toValue: 1, duration: 2100, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onDone?.();
      });
    }, 2350);
    return () => clearTimeout(timer);
  }, [drive, fade, onDone]);
  const translateX = drive.interpolate({ inputRange: [0, 1], outputRange: [-230, 230] });
  return <Animated.View style={[styles.vanIntroOverlay, { backgroundColor: c.background, opacity: fade }]} pointerEvents="auto">
    <View style={{ alignItems: 'center', width: '100%' }}>
      <View style={{ height: 120, width: '100%', justifyContent: 'center', overflow: 'hidden' }}>
        <Animated.View style={{ transform: [{ translateX }], alignItems: 'center' }}>
          <MaterialCommunityIcons name="van-utility" size={86} color={c.mode === 'dark' ? '#FFFFFF' : palette.plum} />
          <View style={{ width: 105, height: 3, borderRadius: 3, backgroundColor: palette.blush, marginTop: -5 }} />
        </Animated.View>
      </View>
      <Text style={{ color: c.text, fontSize: 27, fontWeight: '900', letterSpacing: 1.5 }}>GLOI<Text style={{ color: '#E66F8A' }}>GO</Text></Text>
      <Text style={{ color: c.muted, fontSize: 11, fontWeight: '800', letterSpacing: 2, marginTop: 7 }}>HELP WHEN YOU NEED IT</Text>
      <View style={{ width: 92, height: 4, backgroundColor: c.surfaceAlt, borderRadius: 9, overflow: 'hidden', marginTop: 23 }}>
        <View style={{ width: '100%', height: '100%', backgroundColor: palette.sage }} />
      </View>
      <TouchableOpacity onPress={onDone} style={{ marginTop: 20, padding: 8 }}><Text style={{ color: c.muted, fontSize: 11 }}>Skip intro</Text></TouchableOpacity>
    </View>
  </Animated.View>;
}

function AuthScreen() {
  const { c } = useTheme();
  const { login, register } = useData();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password) return Alert.alert('Details required', 'Enter your email and password.');
    if (mode === 'register' && name.trim().length < 2) return Alert.alert('Name required', 'Enter your full name.');
    if (password.length < 8) return Alert.alert('Password too short', 'Use at least 8 characters.');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password });
        Alert.alert('Registration submitted', 'If email confirmation is enabled in Supabase, verify your email and then sign in.');
        setMode('login');
      }
    } catch (error) {
      Alert.alert(mode === 'login' ? 'Sign in failed' : 'Registration failed', error.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView contentContainerStyle={[styles.screenContent, { flexGrow: 1, justifyContent: 'center' }]}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Image source={require('../assets/gloigo-logo.png')} style={{ width: 118, height: 118 }} resizeMode="contain" />
          <T style={{ fontSize: 22, fontWeight: '900', marginTop: 8 }}>Welcome to GloiGO</T>
          <T style={{ color: c.muted, fontSize: 12, marginTop: 5, textAlign: 'center' }}>Help when you need it.</T>
        </View>
        <Card style={{ padding: 18 }}>
          <T style={{ fontSize: 18, fontWeight: '900', marginBottom: 14 }}>{mode === 'login' ? 'Customer sign in' : 'Create customer account'}</T>
          {mode === 'register' ? <Field label="Full name" value={name} onChangeText={setName} placeholder="Your full name" /> : null}
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" />
          <PrimaryButton title={busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} onPress={submit} disabled={busy} />
          <TouchableOpacity onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ padding: 12, alignItems: 'center' }}>
            <T style={{ color: c.primary, fontWeight: '800', fontSize: 12 }}>{mode === 'login' ? 'New to GloiGO? Create account' : 'Already registered? Sign in'}</T>
          </TouchableOpacity>
        </Card>
        <T style={{ color: c.muted, fontSize: 10, textAlign: 'center' }}>Your account and bookings are managed by the GloiGO backend and Supabase.</T>
      </ScrollView>
    </SafeAreaView>
  );
}

function MainApp() {
  const { c, mode } = useTheme();
  const { token, authLoading, logout } = useData();
  const [page, setPage] = useState('Home');
  const [preset, setPreset] = useState(null);
  const [showVanIntro, setShowVanIntro] = useState(true);
  const replayVanIntro = () => setShowVanIntro(true);
  const navigate = (next, nextPreset) => {
    if (next === 'Book') setPreset(nextPreset || null);
    setPage(next);
  };

  if (authLoading) {
    return <SafeAreaView style={{ flex: 1, backgroundColor: c.background, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
      <Image source={require('../assets/gloigo-logo.png')} style={{ width: 100, height: 100 }} resizeMode="contain" />
      <T style={{ marginTop: 12, fontWeight: '800' }}>Loading your account…</T>
    </SafeAreaView>;
  }

  if (!token) {
    return <>
      <AuthScreen />
      {showVanIntro ? <VanIntro onDone={() => setShowVanIntro(false)} /> : null}
    </>;
  }

  let content;
  if (page === 'Home') content = <HomeScreen navigate={navigate} onRefresh={replayVanIntro} />;
  else if (page === 'Explore') content = <ExploreScreen navigate={navigate} />;
  else if (page === 'Book') content = <BookScreen navigate={navigate} preset={preset} />;
  else if (page === 'Bookings') content = <BookingsScreen navigate={navigate} />;
  else if (page === 'Profile') content = <ProfileScreen navigate={navigate} onLogout={logout} />;
  else content = <SettingsScreen navigate={navigate} />;

  return <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
    <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={c.background} />
    <View style={{ flex: 1 }}>{content}</View>
    <BottomNavigation active={page} navigate={navigate} />
    {showVanIntro ? <VanIntro onDone={() => setShowVanIntro(false)} /> : null}
  </SafeAreaView>;
}

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <MainApp />
      </DataProvider>
    </ThemeProvider>
  );
}


const styles = StyleSheet.create({
  vanIntroOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  celebrationBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  celebrationCard: { width: '100%', maxWidth: 360, borderRadius: 28, borderWidth: 1, padding: 23, alignItems: 'center', gap: 12, elevation: 18 },
  successId: { width: '100%', borderRadius: 12, borderWidth: 1, padding: 11, alignItems: 'center' },
  screenContent: { paddingHorizontal: 19, paddingTop: 15, paddingBottom: 25, gap: 15 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 3, minHeight: 62, gap: 9 },
  headerLogo: { width: 48, height: 48, borderRadius: 12 },
  brandEyebrow: { fontSize: 9, letterSpacing: 2.8, fontWeight: '900', color: palette.sage, marginBottom: 4 },
  headerTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 11, marginTop: 3, lineHeight: 16 },
  profileButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  backButton: { width: 38, height: 38, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  card: { borderWidth: 1, borderRadius: 19, padding: 14 },
  hero: { minHeight: 213, borderRadius: 24, padding: 20, overflow: 'hidden', justifyContent: 'center' },
  heroOrb: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  heroTitle: { fontSize: 23, fontWeight: '900', letterSpacing: -0.7 },
  heroText: { fontSize: 12, lineHeight: 18, marginTop: 7, maxWidth: 275 },
  heroDecorOne: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', right: -35, top: -48 },
  heroDecorTwo: { position: 'absolute', width: 82, height: 82, borderRadius: 41, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', right: 24, bottom: -49 },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: -0.3 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 11 },
  serviceTile: { minHeight: 139, padding: 13 },
  iconTile: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { fontSize: 12, fontWeight: '900', marginTop: 12 },
  serviceSubtitle: { fontSize: 10, marginTop: 4, lineHeight: 14, paddingRight: 10 },
  tileArrow: { position: 'absolute', right: 12, top: 14 },
  activeCard: { flexDirection: 'row', alignItems: 'center', padding: 13 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  stepNumber: { width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  mapPanel: { height: 245, borderRadius: 21, borderWidth: 1, overflow: 'hidden', position: 'relative' },
  road: { position: 'absolute', height: 8, borderRadius: 10, opacity: 0.8 },
  roadA: { width: '120%', top: 65, left: -20, transform: [{ rotate: '18deg' }] },
  roadB: { width: '120%', top: 145, left: -25, transform: [{ rotate: '-20deg' }] },
  roadC: { width: '100%', top: 115, left: 30, transform: [{ rotate: '72deg' }] },
  roadD: { width: '100%', top: 120, left: -80, transform: [{ rotate: '-66deg' }] },
  mapPin: { position: 'absolute', width: 29, height: 29, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  mapCurrent: { position: 'absolute', top: '45%', left: '48%', width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  mapLabel: { position: 'absolute', top: '45%', left: '58%', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, fontSize: 13 },
  fieldLabel: { fontSize: 11, fontWeight: '800', marginBottom: 7 },
  cardTitle: { fontSize: 15, fontWeight: '900', marginBottom: 14 },
  choice: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  button: { minHeight: 47, borderRadius: 14, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  inlineRow: { flexDirection: 'row', alignItems: 'center' },
  profileLarge: { width: 70, height: 70, borderRadius: 23, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 18 },
  menuCard: { padding: 15 },
  themePreview: { marginTop: 15, padding: 12, borderRadius: 12, borderWidth: 1 },
  paletteRow: { flexDirection: 'row', alignItems: 'center', marginTop: 13 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 7, paddingBottom: Platform.OS === 'android' ? 7 : 3 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
});