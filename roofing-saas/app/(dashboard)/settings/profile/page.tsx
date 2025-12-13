'use client'

// =============================================
// User Profile & Security Settings Page
// =============================================
// Route: /settings/profile
// Purpose: User profile editing, password change, photo upload
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  User,
  Camera,
  Lock,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Upload,
  Bell
} from 'lucide-react'
import type {
  UserProfile,
  ChangePasswordInput,
  PasswordStrength
} from '@/lib/types/user-profile'
import {
  validatePasswordStrength,
  validatePasswordRequirements,
  getPasswordStrengthColor,
  getPasswordStrengthLabel,
  PASSWORD_REQUIREMENTS,
  US_STATES,
  US_TIMEZONES
} from '@/lib/types/user-profile'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Image from 'next/image'
import { NotificationPreferences } from '@/components/settings/NotificationPreferences'

export default function ProfileSettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    job_title: '',
    bio: '',
    // Address fields
    street_address: '',
    city: '',
    state: '',
    zip_code: '',
    // Timezone
    timezone: '',
  })

  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null)
  const [passwordErrors, setPasswordErrors] = useState<string[]>([])
  const [changingPassword, setChangingPassword] = useState(false)

  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')

      const data = await response.json()
      setProfile(data.profile)
      setProfileForm({
        full_name: data.profile.full_name || '',
        phone: data.profile.phone || '',
        job_title: data.profile.job_title || '',
        bio: data.profile.bio || '',
        // Address fields
        street_address: data.profile.street_address || '',
        city: data.profile.city || '',
        state: data.profile.state || '',
        zip_code: data.profile.zip_code || '',
        // Timezone
        timezone: data.profile.timezone || '',
      })
    } catch (error) {
      console.error('Error fetching profile:', error)
      setMessage({ type: 'error', text: 'Failed to load profile' })
    } finally {
      setLoading(false)
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfile(data.profile)
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile'
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = (field: keyof ChangePasswordInput, value: string) => {
    const updated = { ...passwordForm, [field]: value }
    setPasswordForm(updated)

    if (field === 'new_password') {
      const strength = validatePasswordStrength(value)
      setPasswordStrength(strength)

      const validation = validatePasswordRequirements(value)
      setPasswordErrors(validation.errors)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordForm),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: '',
      })
      setPasswordStrength(null)
      setPasswordErrors([])
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password'
      })
    } finally {
      setChangingPassword(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'File too large. Maximum size is 5MB.' })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    setUploadingPhoto(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/profile/upload-photo', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo')
      }

      setProfile((prev) => prev ? { ...prev, avatar_url: data.avatar_url } : null)
      setMessage({ type: 'success', text: 'Profile photo updated!' })
      setPhotoPreview(null)
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload photo'
      })
      setPhotoPreview(null)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handlePhotoDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile photo?')) return

    setDeletingPhoto(true)
    setMessage(null)

    try {
      const response = await fetch('/api/profile/upload-photo', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete photo')
      }

      setProfile((prev) => prev ? { ...prev, avatar_url: null } : null)
      setMessage({ type: 'success', text: 'Profile photo deleted' })
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to delete photo'
      })
    } finally {
      setDeletingPhoto(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Profile & Security</h1>
        <p className="text-muted-foreground mt-2">
          Manage your profile information and security settings
        </p>
      </div>

      {message && (
        <Alert className={`mb-6 ${message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </div>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="max-w-3xl">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Profile Photo */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Photo</CardTitle>
              <CardDescription>
                Upload a profile photo (max 5MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="relative">
                  {photoPreview || profile?.avatar_url ? (
                    <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border">
                      <Image
                        src={photoPreview || profile?.avatar_url || '/placeholder-avatar.png'}
                        alt="Profile photo"
                        fill
                        className="object-cover"
                      />
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <div>
                    <Input
                      id="photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhoto}
                      className="hidden"
                    />
                    <Label htmlFor="photo-upload">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingPhoto}
                        onClick={() => document.getElementById('photo-upload')?.click()}
                        asChild
                      >
                        <span>
                          {uploadingPhoto ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Photo
                            </>
                          )}
                        </span>
                      </Button>
                    </Label>
                  </div>

                  {profile?.avatar_url && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePhotoDelete}
                      disabled={deletingPhoto}
                    >
                      {deletingPhoto ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email cannot be changed. Contact support if needed.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={profileForm.full_name}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    value={profileForm.job_title}
                    onChange={(e) => setProfileForm({ ...profileForm, job_title: e.target.value })}
                    placeholder="Sales Representative"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={profileForm.bio}
                    onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                    placeholder="Tell us about yourself..."
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>
                Your mailing address for company correspondence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="street_address">Street Address</Label>
                  <Input
                    id="street_address"
                    value={profileForm.street_address}
                    onChange={(e) => setProfileForm({ ...profileForm, street_address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      placeholder="Nashville"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Select
                      value={profileForm.state}
                      onValueChange={(value) => setProfileForm({ ...profileForm, state: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {US_STATES.map((state) => (
                          <SelectItem key={state.value} value={state.value}>
                            {state.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 max-w-[200px]">
                  <Label htmlFor="zip_code">ZIP Code</Label>
                  <Input
                    id="zip_code"
                    value={profileForm.zip_code}
                    onChange={(e) => setProfileForm({ ...profileForm, zip_code: e.target.value })}
                    placeholder="37201"
                    maxLength={10}
                  />
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Address'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle>Timezone</CardTitle>
              <CardDescription>
                Set your timezone for scheduling and notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Your Timezone</Label>
                  <Select
                    value={profileForm.timezone}
                    onValueChange={(value) => setProfileForm({ ...profileForm, timezone: value })}
                  >
                    <SelectTrigger className="max-w-[350px]">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label} ({tz.offset})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {profileForm.timezone && (
                    <p className="text-sm text-muted-foreground">
                      Current time: {new Date().toLocaleTimeString('en-US', {
                        timeZone: profileForm.timezone,
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  )}
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Timezone'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <NotificationPreferences />
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          {/* Change Password */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current_password">Current Password</Label>
                  <Input
                    id="current_password"
                    type="password"
                    value={passwordForm.current_password}
                    onChange={(e) => handlePasswordChange('current_password', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new_password">New Password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    value={passwordForm.new_password}
                    onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                    required
                  />

                  {/* Password Strength Meter */}
                  {passwordForm.new_password && passwordStrength && (
                    <div className="space-y-2 mt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span>Password strength:</span>
                        <span className="font-medium">{getPasswordStrengthLabel(passwordStrength)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${getPasswordStrengthColor(passwordStrength)}`}
                          style={{
                            width: passwordStrength === 'weak' ? '25%' :
                                   passwordStrength === 'fair' ? '50%' :
                                   passwordStrength === 'good' ? '75%' : '100%'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Password Requirements */}
                  <div className="mt-3 p-3 bg-background rounded-md">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Password must contain:</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li className="flex items-center gap-2">
                        <span className={passwordForm.new_password.length >= PASSWORD_REQUIREMENTS.minLength ? 'text-green-600' : 'text-muted-foreground'}>
                          {passwordForm.new_password.length >= PASSWORD_REQUIREMENTS.minLength ? '✓' : '○'}
                        </span>
                        At least {PASSWORD_REQUIREMENTS.minLength} characters
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[A-Z]/.test(passwordForm.new_password) ? 'text-green-600' : 'text-muted-foreground'}>
                          {/[A-Z]/.test(passwordForm.new_password) ? '✓' : '○'}
                        </span>
                        One uppercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[a-z]/.test(passwordForm.new_password) ? 'text-green-600' : 'text-muted-foreground'}>
                          {/[a-z]/.test(passwordForm.new_password) ? '✓' : '○'}
                        </span>
                        One lowercase letter
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[0-9]/.test(passwordForm.new_password) ? 'text-green-600' : 'text-muted-foreground'}>
                          {/[0-9]/.test(passwordForm.new_password) ? '✓' : '○'}
                        </span>
                        One number
                      </li>
                      <li className="flex items-center gap-2">
                        <span className={/[^a-zA-Z0-9]/.test(passwordForm.new_password) ? 'text-green-600' : 'text-muted-foreground'}>
                          {/[^a-zA-Z0-9]/.test(passwordForm.new_password) ? '✓' : '○'}
                        </span>
                        One special character
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm New Password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                    required
                  />
                  {passwordForm.confirm_password && passwordForm.new_password !== passwordForm.confirm_password && (
                    <p className="text-xs text-red-600">Passwords do not match</p>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={changingPassword || passwordErrors.length > 0 || passwordForm.new_password !== passwordForm.confirm_password}
                >
                  {changingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Account Information */}
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">User ID</span>
                <span className="text-sm font-mono">{profile?.id.substring(0, 8)}...</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Account Created</span>
                <span className="text-sm">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="text-sm">
                  {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
