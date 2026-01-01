import Navbar from "~/components/Navbar";
import type { Route } from "./+types/home";
import ResumeCard from "~/components/ResumeCard";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream Job!!" },
  ];
}

export default function Home() {
  //ui trick to save which page was trying to be accessed by an unauthenticated user and then push them back there after auth
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);


  useEffect(() => {
    if (!auth.isAuthenticated) navigate("/auth?next=/");
  }, [auth.isAuthenticated]);

useEffect(() => {
  const loadResumes = async () => {
        setLoadingResumes(true);

        const resumes = (await kv.list('resume:*', true)) as KVItem[];

        const parsedResumes = resumes?.map((resume)=>(JSON.parse(resume.value) as Resume))
        console.log('parsedResumes', parsedResumes);
        setResumes(parsedResumes || []);
        setLoadingResumes(false);
  }
loadResumes();

}, []);


  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />
      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Track Your Applicaitons & Resume Ratings</h1>
           {!loadingResumes && resumes.length === 0 ? (
            <h2>No resumes found. Upload your Resume to get feedback</h2>
           ):(
            <h2>Review your submissions and chceck AI-Powered Feedback</h2>
           )}
        </div>

        {loadingResumes && (
          <div flex flex-col items-center justify-center>
            <img src = "/images/resume-scan.gif" className='w-[200px]' />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}
        {!loadingResumes && resumes.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link to ="/upload" className="primary-button w-fit text-xl font-semibold">
              Upload Resume
             </Link>
          </div>
        )}
      </section>
    </main>
  );
}
