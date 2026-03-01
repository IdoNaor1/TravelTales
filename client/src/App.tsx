import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import PostDetailPage from './pages/PostDetailPage';
import EditPostPage from './pages/EditPostPage';
import CreatePostPage from './pages/CreatePostPage';
import AiAssistantPage from './pages/AiAssistantPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile/:userId" element={<ProfilePage />} />
        <Route path="/post/:postId" element={<PostDetailPage />} />
        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/post/:postId/edit" element={<EditPostPage />} />
          <Route path="/create" element={<CreatePostPage />} />
          <Route path="/ai" element={<AiAssistantPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
