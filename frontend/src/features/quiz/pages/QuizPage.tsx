import useStore from '../../../store/useStore';
import QuizStartScreen from '../components/QuizStartScreen';
import QuizPlayground from '../components/QuizPlayground';
import QuizEmptyState from '../components/QuizEmptyState';

export default function QuizPage() {
  const quizCard = useStore((state) => state.quizCard);
  const dictionary = useStore((state) => state.dictionary);

  if (dictionary.length === 0) {
    return <QuizEmptyState />;
  }

  if (!quizCard) {
    return <QuizStartScreen />;
  }

  return <QuizPlayground />;
}
