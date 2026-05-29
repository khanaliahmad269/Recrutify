import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import DashboardLayout from '../layouts/DashboardLayout.jsx'
import Home from '../pages/Home.jsx'
import Jobs from '../pages/Jobs.jsx'
import JobDetail from '../pages/JobDetail.jsx'
import Companies from '../pages/Companies.jsx'
import CompanyDetail from '../pages/CompanyDetail.jsx'
import Login from '../pages/Login.jsx'
import Register from '../pages/Register.jsx'
import About from '../pages/About.jsx'
import Contact from '../pages/Contact.jsx'
import Privacy from '../pages/Privacy.jsx'
import Dashboard from '../pages/Dashboard.jsx'
import Profile from '../pages/dashboard/Profile.jsx'
import Applications from '../pages/dashboard/Applications.jsx'
import SavedJobs from '../pages/dashboard/SavedJobs.jsx'
import Resume from '../pages/dashboard/Resume.jsx'
import Recommendations from '../pages/dashboard/Recommendations.jsx'
import CompanyEditor from '../pages/dashboard/CompanyEditor.jsx'
import MyJobs from '../pages/dashboard/MyJobs.jsx'
import PostJob from '../pages/dashboard/PostJob.jsx'
import EditJob from '../pages/dashboard/EditJob.jsx'
import JobApplicants from '../pages/dashboard/JobApplicants.jsx'
import AdminUsers from '../pages/dashboard/AdminUsers.jsx'
import AdminCompanies from '../pages/dashboard/AdminCompanies.jsx'
import AdminJobs from '../pages/dashboard/AdminJobs.jsx'
import NotFound from '../pages/NotFound.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

const SEEKER = ['job_seeker']
const EMPLOYER = ['employer', 'admin']
const ADMIN = ['admin']

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="jobs" element={<Jobs />} />
        <Route path="jobs/:id" element={<JobDetail />} />
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="privacy" element={<Privacy />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="profile" element={<Profile />} />

          {/* Seeker */}
          <Route path="resume" element={<ProtectedRoute roles={SEEKER}><Resume /></ProtectedRoute>} />
          <Route path="recommendations" element={<ProtectedRoute roles={SEEKER}><Recommendations /></ProtectedRoute>} />
          <Route path="applications" element={<ProtectedRoute roles={SEEKER}><Applications /></ProtectedRoute>} />
          <Route path="saved" element={<ProtectedRoute roles={SEEKER}><SavedJobs /></ProtectedRoute>} />

          {/* Employer / admin */}
          <Route path="company" element={<ProtectedRoute roles={EMPLOYER}><CompanyEditor /></ProtectedRoute>} />
          <Route path="jobs" element={<ProtectedRoute roles={EMPLOYER}><MyJobs /></ProtectedRoute>} />
          <Route path="jobs/new" element={<ProtectedRoute roles={EMPLOYER}><PostJob /></ProtectedRoute>} />
          <Route path="jobs/:id/edit" element={<ProtectedRoute roles={EMPLOYER}><EditJob /></ProtectedRoute>} />
          <Route path="jobs/:id/applicants" element={<ProtectedRoute roles={EMPLOYER}><JobApplicants /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="admin/users" element={<ProtectedRoute roles={ADMIN}><AdminUsers /></ProtectedRoute>} />
          <Route path="admin/companies" element={<ProtectedRoute roles={ADMIN}><AdminCompanies /></ProtectedRoute>} />
          <Route path="admin/jobs" element={<ProtectedRoute roles={ADMIN}><AdminJobs /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
