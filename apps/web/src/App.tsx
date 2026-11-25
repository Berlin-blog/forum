import { HashRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { BarPage } from './pages/BarPage';
import { BarsPage } from './pages/BarsPage';
import { CreateBarPage } from './pages/CreateBarPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NewThreadPage } from './pages/NewThreadPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ThreadPage } from './pages/ThreadPage';
import { ProfilePage } from './pages/UserPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/bars" element={<BarsPage />} />
          <Route path="/create-bar" element={<CreateBarPage />} />
          <Route path="/b/:slug" element={<BarPage />} />
          <Route path="/b/:slug/new" element={<NewThreadPage />} />
          <Route path="/new" element={<NewThreadPage />} />
          <Route path="/t/:id" element={<ThreadPage />} />
          <Route path="/u/:username" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
