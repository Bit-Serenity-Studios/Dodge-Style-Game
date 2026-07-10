import 'react-native-gesture-handler';
// Web-only Fast Refresh runtime. No-op on native, required by the
// Metro static web export to bootstrap the React root.
import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);
