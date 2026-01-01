
import { prepareInstructions } from '../../constants'
import {useState, type FormEvent} from 'react'
import { useNavigate } from 'react-router'
import FileUploader from '~/components/FileUploader'
import Navbar from '~/components/Navbar'
import { convertPdfToImage } from '~/lib/pdf2img'
import { usePuterStore } from '~/lib/puter'
import { generateUUID } from '~/lib/utils'

const upload = () => {
    const {auth,isLoading, fs,ai,kv} = usePuterStore()
    const navigate=useNavigate()
    const [isProcessing, setIsProcessing] = useState(false)
    const [statusText, setStatusText] = useState('')
    const [file, setFile] = useState<File|null>(null)

    const handleFileSelect = (file:File|null) => {
        setFile(file)
    }
    

    const handleAnalyze = async ({companyName, jobTitle, jobDescription, file}:{companyName:string , jobTitle:string, jobDescription:string, file:File}) => {
        try {
            setIsProcessing(true)
            setStatusText('Uploading Resume...')

            const uploadedFile = await fs.upload([file])
            if(!uploadedFile) {
                setIsProcessing(false)
                return setStatusText('Failed to upload file. Please try again.')
            }

            setStatusText('Converting to Image...')
            const ImageFile = await convertPdfToImage(file)
            if(!ImageFile.file) {
                setIsProcessing(false)
                return setStatusText('Failed to convert file to image.')
            }

            setStatusText('Uploading the Image')
            const uploadedImage = await fs.upload([ImageFile.file])
            if(!uploadedImage) {
                setIsProcessing(false)
                return setStatusText('Failed to upload File. Please try again.')
            }

            setStatusText('perparing Data ...')
            const uuid = generateUUID()

            const data = {
                id:uuid,
                resumePath: uploadedFile.path,
                imagePath: uploadedImage.path,
                companyName,
                jobTitle,
                jobDescription,
                feedback:''
            }
            await kv.set(`resume:${uuid}`,JSON.stringify(data))
            
            setStatusText('Analyzing ...')

            const feedback = await ai.feedback(
                uploadedFile.path,
                prepareInstructions({jobTitle, jobDescription})
            )
            
            if(!feedback) {
                setIsProcessing(false)
                return setStatusText('Failed to analyze resume. Please try again.')
            }

            console.log('Raw AI Response:', feedback)

            // Handle different response formats
            let feedbackText = ''
            if (typeof feedback.message.content === 'string') {
                feedbackText = feedback.message.content
            } else if (Array.isArray(feedback.message.content)) {
                const textContent = feedback.message.content.find((item: any) => item.type === 'text' || item.text)
                feedbackText = textContent?.text || textContent?.content || ''
            }
            
            if (!feedbackText) {
                console.error('Invalid feedback format:', feedback)
                setIsProcessing(false)
                return setStatusText('Invalid AI response format. Please try again.')
            }

            // Remove markdown code blocks if present
            feedbackText = feedbackText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
            
            console.log('Cleaned feedback text:', feedbackText)

            // Parse and validate JSON
            let parsedFeedback
            try {
                parsedFeedback = JSON.parse(feedbackText)
            } catch (parseError) {
                console.error('JSON parse error:', parseError, 'Text:', feedbackText)
                setIsProcessing(false)
                return setStatusText('Failed to parse AI response. Please try again.')
            }
            
            // Validate the structure matches expected format
            if (!parsedFeedback.overallScore || !parsedFeedback.ATS) {
                console.error('Invalid feedback structure:', parsedFeedback)
                setIsProcessing(false)
                return setStatusText('Invalid feedback format from AI. Please try again.')
            }
            
            data.feedback = parsedFeedback

            await kv.set(`resume:${uuid}`,JSON.stringify(data))

            setStatusText('Analysis Complete! Redirecting...')

            console.log('FINAL DATA',data)
            navigate(`/resume/${uuid}`)
        } catch (err) {
            console.error('Analysis error:', err)
            setIsProcessing(false)
            setStatusText(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
        }
    }

    const handleSubmit = (e:FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = e.currentTarget.closest('form')
        if(!form) return

        const formData = new FormData(form)

        const companyName = formData.get('company-name') as string
        const jobTitle = formData.get('job-title') as string
        const jobDescription = formData.get('job-description') as string

        if(!file) return

        handleAnalyze({companyName, jobTitle, jobDescription, file})
    }


  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
    <Navbar />
    <section className="main-section">
        <div className='page-heading py-16'>
            <h1>
                Smart feedback for your dream job
            </h1>
            {isProcessing ? (
                <>
                <h2>{statusText}</h2>
                <img src='/images/resume-scan.gif' className='w-full'/>
                </>
            ):(
                <h2>Drop your resume for an ATS score and improvement tips</h2>
            )}
            {!isProcessing && (
                <form id="upload-form" onSubmit={handleSubmit} className='flex flex-col gap-4 mt-8'>
                    <div className='form-div'>
                    <label htmlFor="Company-name">Company Name</label>
                    <input type="text" name="company-name" placeholder='Company Name' id='company-name' />
                    </div>
                    <div className='form-div'>
                    <label htmlFor="job-title">Job Title</label>
                    <input type="text" name="job-title" placeholder='Job Title' id='job-title' />
                    </div>
                    <div className='form-div'>
                    <label htmlFor="job-description">Job Description</label>
                    <textarea rows={5} name="job-description" placeholder='Job Description' id='job-description' />
                    </div>
                    <div className='form-div'>
                    <label htmlFor="uploader">Upload Resume</label>
                    <div className="w-full">
                        <FileUploader onFileSelect={handleFileSelect}/>
                    </div>
                    </div>
                    <button className='primary-button' type='submit'>
                        <p>Analyse Resume</p>
                    </button>
                </form>
            )}
        </div>
    </section>
    </main>
  )
}

export default upload