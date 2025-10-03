import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { SurveyForm } from '@/components/surveys/survey-form'

/**
 * New survey page
 */
export default async function NewSurveyPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Send New Survey</h1>
          <p className="text-gray-600 mt-1">
            Create and send a customer satisfaction survey
          </p>
        </div>

        <SurveyForm />
      </div>
    </div>
  )
}
