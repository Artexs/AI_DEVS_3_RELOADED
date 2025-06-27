import { Centrala } from '../functions/CentralaService';

(async () => {
    const centrala = new Centrala();
    // Adjust these as needed for your test data
    const filename = 'phone_questions.json';
    const fileLocation = 'AI_DEVS_3/data/S05/E01';

    const sendAnswer = async (answer: string) =>
    {
        console.log('---------------------------------------------------')
        const info = centrala.getCurrentQuestionInfo();
        console.log('Current question info:', info);

        // Optionally, test submitAnswer
        const answerResult = await centrala.submitAnswer(answer);
        console.log('result:', answerResult);
    }

    try {
        await centrala.initState(filename, fileLocation, 'phone', true);
        await sendAnswer('test answer')
        await sendAnswer('Barbara Zawadzka')
        await sendAnswer('Samuel')
        await sendAnswer('test answer')
        await sendAnswer('https://rafal.ag3nts.org/510bc')
        await sendAnswer('test answer')
        
    } catch (err) {
        console.error('Test failed:', err);
    }
})();
