import logging
from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.commerce import Product
from app.models.enums import Difficulty, ProductType, TestStatus, UserRole
from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.models.test import Test
from app.models.user import User

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

INITIAL_CATEGORIES_DATA = {
    "Quantitative Aptitude": {
        "slug": "quantitative-aptitude",
        "topics": [
            ("Number System", "number-system"),
            ("Percentage", "percentage"),
            ("Profit & Loss", "profit-and-loss"),
            ("Ratio & Proportion", "ratio-and-proportion"),
            ("Average", "average"),
            ("Simple Interest", "simple-interest"),
            ("Compound Interest", "compound-interest"),
            ("Time & Work", "time-and-work"),
            ("Pipes & Cisterns", "pipes-and-cisterns"),
            ("Time Speed Distance", "time-speed-distance"),
            ("Boats & Streams", "boats-and-streams"),
            ("Probability", "probability"),
            ("Permutation & Combination", "permutation-and-combination"),
            ("Algebra", "algebra"),
            ("Data Interpretation", "data-interpretation"),
        ],
    },
    "Logical Reasoning": {
        "slug": "logical-reasoning",
        "topics": [
            ("Number Series", "number-series"),
            ("Alphabet Series", "alphabet-series"),
            ("Coding-Decoding", "coding-decoding"),
            ("Blood Relations", "blood-relations"),
            ("Direction Sense", "direction-sense"),
            ("Syllogisms", "syllogisms"),
            ("Analogies", "analogies"),
            ("Classification", "classification"),
            ("Seating Arrangement", "seating-arrangement"),
            ("Puzzles", "puzzles"),
            ("Statement & Conclusion", "statement-and-conclusion"),
            ("Data Sufficiency", "data-sufficiency"),
        ],
    },
    "Verbal Ability": {
        "slug": "verbal-ability",
        "topics": [
            ("Vocabulary", "vocabulary"),
            ("Synonyms", "synonyms"),
            ("Antonyms", "antonyms"),
            ("Grammar", "grammar"),
            ("Sentence Correction", "sentence-correction"),
            ("Fill in the Blanks", "fill-in-the-blanks"),
            ("Para Jumbles", "para-jumbles"),
            ("Reading Comprehension", "reading-comprehension"),
            ("Error Detection", "error-detection"),
        ],
    },
    "Technical CS/IT": {
        "slug": "technical-cs-it",
        "topics": [
            ("C & C++ Programming", "c-cpp-programming"),
            ("OOPs Concepts", "oops-concepts"),
            ("Pointers & Memory", "pointers-memory"),
            ("Data Structures", "data-structures"),
            ("DBMS & SQL", "dbms-sql"),
            ("Operating Systems", "operating-systems"),
            ("Computer Networks", "computer-networks"),
        ],
    },
}

EXPANDED_QUESTIONS = [
    # --- QUANTITATIVE APTITUDE ---
    {
        "category": "Quantitative Aptitude",
        "topic": "Percentage",
        "question_text": "A student scored 72 marks out of 80 in a placement aptitude test. What is the student's percentage score?",
        "option_a": "85%",
        "option_b": "90%",
        "option_c": "92%",
        "option_d": "95%",
        "correct_answer": "B",
        "explanation": "Percentage = (Marks Obtained / Total Marks) * 100 = (72 / 80) * 100 = 0.9 * 100 = 90%.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Campus Placement 2024",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Profit & Loss",
        "question_text": "An article is sold for ₹600 at a loss of 20%. At what price should it be sold to gain 20% profit?",
        "option_a": "₹800",
        "option_b": "₹850",
        "option_c": "₹900",
        "option_d": "₹920",
        "correct_answer": "C",
        "explanation": "Selling price at 20% loss = 0.8 * CP = 600 => CP = 600 / 0.8 = 750. For 20% gain, SP = 1.2 * 750 = ₹900.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 60,
        "is_premium": False,
        "source": "TCS NQT Prep Set",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Time & Work",
        "question_text": "A can finish a work in 12 days and B can finish it in 18 days. They begin together, but A leaves 4 days before completion. In how many total days was the work completed?",
        "option_a": "9.6 days",
        "option_b": "10.4 days",
        "option_c": "11.2 days",
        "option_d": "12.0 days",
        "correct_answer": "A",
        "explanation": "Total work = LCM(12, 18) = 36 units. Rate of A = 3 units/day, Rate of B = 2 units/day. In the last 4 days, only B worked, completing 4 * 2 = 8 units. Remaining work = 36 - 8 = 28 units done by both together at rate 5 units/day. Days together = 28 / 5 = 5.6 days. Total days = 5.6 + 4 = 9.6 days.",
        "difficulty": Difficulty.HARD,
        "estimated_time_seconds": 90,
        "is_premium": True,
        "source": "Infosys Special Test 2024",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Simple Interest",
        "question_text": "A sum of money doubles itself in 5 years at simple interest. In how many years will it become 4 times itself at the same rate?",
        "option_a": "10 years",
        "option_b": "12 years",
        "option_c": "15 years",
        "option_d": "20 years",
        "correct_answer": "C",
        "explanation": "To double, Simple Interest = Principal (P). SI = (P * R * 5) / 100 = P => R = 20% per annum. To become 4 times, SI must be 3P. 3P = (P * 20 * T) / 100 => T = (3 * 100) / 20 = 15 years.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "Wipro Elite Practice Set",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Ratio & Proportion",
        "question_text": "The ratio of boys to girls in a college campus drive is 5 : 3. If there are 120 boys, how many total students appeared for the drive?",
        "option_a": "180",
        "option_b": "192",
        "option_c": "200",
        "option_d": "240",
        "correct_answer": "B",
        "explanation": "Let common ratio factor be x. 5x = 120 => x = 24. Number of girls = 3 * 24 = 72. Total students = 120 + 72 = 192.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Campus Standard 2024",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Average",
        "question_text": "The average age of 24 students in a class is 15 years. If the teacher's age is included, the average increases by 1 year. What is the teacher's age?",
        "option_a": "38 years",
        "option_b": "40 years",
        "option_c": "42 years",
        "option_d": "45 years",
        "correct_answer": "B",
        "explanation": "Total age of 24 students = 24 * 15 = 360 years. With teacher, 25 people have average age 16. Total age = 25 * 16 = 400 years. Teacher's age = 400 - 360 = 40 years.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "Cognizant GenC Diagnostic",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Time Speed Distance",
        "question_text": "A train running at 54 km/h crosses an electric pole in 20 seconds. What is the length of the train in meters?",
        "option_a": "250 m",
        "option_b": "300 m",
        "option_c": "350 m",
        "option_d": "400 m",
        "correct_answer": "B",
        "explanation": "Speed in m/s = 54 * (5 / 18) = 15 m/s. Length of train = Speed * Time = 15 m/s * 20 s = 300 meters.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Placement Aptitude 2024",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Compound Interest",
        "question_text": "What is the compound interest on ₹10,000 for 2 years at 10% per annum compounded annually?",
        "option_a": "₹2,000",
        "option_b": "₹2,100",
        "option_c": "₹2,200",
        "option_d": "₹2,210",
        "correct_answer": "B",
        "explanation": "Amount = P * (1 + R/100)^T = 10,000 * (1.1)^2 = 10,000 * 1.21 = ₹12,100. Compound Interest = 12,100 - 10,000 = ₹2,100.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "Banking & Placement Standard",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Pipes & Cisterns",
        "question_text": "Pipe A can fill a tank in 6 hours and Pipe B can empty it in 8 hours. If both pipes are opened together in an empty tank, in how many hours will the tank be full?",
        "option_a": "14 hours",
        "option_b": "18 hours",
        "option_c": "24 hours",
        "option_d": "28 hours",
        "correct_answer": "C",
        "explanation": "Net filling rate per hour = 1/6 - 1/8 = (4 - 3)/24 = 1/24 tank per hour. Therefore, the tank fills completely in 24 hours.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 40,
        "is_premium": False,
        "source": "Capgemini Placement Prep",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Probability",
        "question_text": "Two fair dice are thrown simultaneously. What is the probability of getting a sum equal to 8?",
        "option_a": "5/36",
        "option_b": "1/6",
        "option_c": "7/36",
        "option_d": "1/9",
        "correct_answer": "A",
        "explanation": "Total outcomes = 6 * 6 = 36. Favorable outcomes for sum 8 are (2,6), (3,5), (4,4), (5,3), (6,2), which is 5 outcomes. Probability = 5/36.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "Campus Probability Set",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Number System",
        "question_text": "What is the unit digit in the expansion of 7^95 - 3^58?",
        "option_a": "0",
        "option_b": "4",
        "option_c": "6",
        "option_d": "7",
        "correct_answer": "B",
        "explanation": "Cyclicity of 7 is 4: 7, 9, 3, 1. 95 mod 4 = 3, so unit digit of 7^95 is 3. Cyclicity of 3 is 4: 3, 9, 7, 1. 58 mod 4 = 2, so unit digit of 3^58 is 9. Unit digit = (13 - 9) = 4.",
        "difficulty": Difficulty.HARD,
        "estimated_time_seconds": 60,
        "is_premium": False,
        "source": "AMCAT High Difficulty Set",
    },
    {
        "category": "Quantitative Aptitude",
        "topic": "Algebra",
        "question_text": "If x + 1/x = 4, find the value of x^2 + 1/x^2.",
        "option_a": "12",
        "option_b": "14",
        "option_c": "16",
        "option_d": "18",
        "correct_answer": "B",
        "explanation": "Squaring both sides: (x + 1/x)^2 = x^2 + 2 + 1/x^2 = 16 => x^2 + 1/x^2 = 16 - 2 = 14.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 25,
        "is_premium": False,
        "source": "Campus Drive Quantitative",
    },

    # --- LOGICAL REASONING ---
    {
        "category": "Logical Reasoning",
        "topic": "Number Series",
        "question_text": "Find the next number in the series: 7, 14, 28, 56, ?",
        "option_a": "84",
        "option_b": "102",
        "option_c": "112",
        "option_d": "128",
        "correct_answer": "C",
        "explanation": "Each number is multiplied by 2: 7*2=14, 14*2=28, 28*2=56, 56*2 = 112.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 20,
        "is_premium": False,
        "source": "Cognizant GenC Diagnostic",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Coding-Decoding",
        "question_text": "In a certain code language, 'ROSE' is coded as 'ILHV'. How is 'MIND' coded in that language?",
        "option_a": "NRMW",
        "option_b": "NRMV",
        "option_c": "OQMW",
        "option_d": "MRNW",
        "correct_answer": "A",
        "explanation": "Each letter is paired with its reverse alphabetical pair: R<->I, O<->L, S<->H, E<->V. Applying same to MIND: M<->N, I<->R, N<->M, D<->W, giving 'NRMW'.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "Accenture Placement Assessment",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Blood Relations",
        "question_text": "Pointing to a photograph, a woman says, 'His father's only son is the husband of my daughter's mother.' How is the man in the photograph related to the woman?",
        "option_a": "Brother",
        "option_b": "Husband",
        "option_c": "Father",
        "option_d": "Son",
        "correct_answer": "B",
        "explanation": "'My daughter's mother' refers to the woman herself. 'The husband of my daughter's mother' is her husband. 'His father's only son' is the man himself. Hence, the man in the photograph is the woman's husband.",
        "difficulty": Difficulty.HARD,
        "estimated_time_seconds": 75,
        "is_premium": False,
        "source": "Capgemini Excellence Series",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Direction Sense",
        "question_text": "Rohan walks 12 km North, turns right and walks 5 km. How far and in which direction is he now from his starting point?",
        "option_a": "13 km North-East",
        "option_b": "13 km North-West",
        "option_c": "17 km North",
        "option_d": "15 km East",
        "correct_answer": "A",
        "explanation": "Using Pythagoras theorem: Distance = sqrt(12^2 + 5^2) = sqrt(144 + 25) = sqrt(169) = 13 km. Direction is North-East.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Placement Reasoning 2024",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Syllogisms",
        "question_text": "Statements: All laptops are devices. Some devices are phones. Conclusions: I. Some laptops are phones. II. All phones are devices.",
        "option_a": "Only conclusion I follows",
        "option_b": "Only conclusion II follows",
        "option_c": "Neither I nor II follows",
        "option_d": "Both I and II follow",
        "correct_answer": "C",
        "explanation": "No direct link between laptops and phones guarantees an intersection (I does not follow). Not all phones need to be devices in reverse universal form (II does not follow). Hence neither follows.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "TCS Ninja Reasoning",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Analogies",
        "question_text": "Select the related word pair: 'Odometer : Mileage :: Compass : ?'",
        "option_a": "Speed",
        "option_b": "Direction",
        "option_c": "Altitude",
        "option_d": "Pressure",
        "correct_answer": "B",
        "explanation": "An odometer measures mileage/distance; a compass determines direction.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 20,
        "is_premium": False,
        "source": "Campus Placement Reasoning",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Alphabet Series",
        "question_text": "What letters complete the series: B, D, G, K, P, ?",
        "option_a": "S",
        "option_b": "T",
        "option_c": "V",
        "option_d": "W",
        "correct_answer": "C",
        "explanation": "Differences between alphabetical positions: B(2) +2 = D(4); D(4) +3 = G(7); G(7) +4 = K(11); K(11) +5 = P(16); P(16) +6 = V(22).",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 25,
        "is_premium": False,
        "source": "Cognizant Diagnostic",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Seating Arrangement",
        "question_text": "Five friends A, B, C, D, and E are sitting in a row facing North. D is to the immediate left of C. B is to the right of E. A is to the right of C and B is to the left of D. Who is sitting in the middle?",
        "option_a": "B",
        "option_b": "C",
        "option_c": "D",
        "option_d": "E",
        "correct_answer": "C",
        "explanation": "Arrangement from left to right: E, B, D, C, A. The person sitting exactly in the middle is D.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 60,
        "is_premium": False,
        "source": "Wipro Placement Mock",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Statement & Conclusion",
        "question_text": "Statement: 'Government has decided to offer scholarships to students scoring above 90% in board exams.' Conclusions: I. Students scoring below 90% will drop out. II. Financial assistance can motivate students to perform better.",
        "option_a": "Only conclusion I follows",
        "option_b": "Only conclusion II follows",
        "option_c": "Either I or II follows",
        "option_d": "Neither I nor II follows",
        "correct_answer": "B",
        "explanation": "Conclusion I is an extreme, unwarranted assumption. Conclusion II logically follows the intention behind government merit scholarships.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 35,
        "is_premium": False,
        "source": "Placement Critical Thinking",
    },
    {
        "category": "Logical Reasoning",
        "topic": "Puzzles",
        "question_text": "In a race of 5 runners, P finished ahead of Q but behind R. S finished ahead of R but behind T. Who won the race?",
        "option_a": "P",
        "option_b": "R",
        "option_c": "S",
        "option_d": "T",
        "correct_answer": "D",
        "explanation": "Order of finish from first to last: T > S > R > P > Q. Therefore, T won the race.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Campus Logic Sprint",
    },

    # --- VERBAL ABILITY ---
    {
        "category": "Verbal Ability",
        "topic": "Synonyms",
        "question_text": "Choose the word that is most nearly identical in meaning to 'METICULOUS':",
        "option_a": "Careless",
        "option_b": "Thorough",
        "option_c": "Hesitant",
        "option_d": "Abrupt",
        "correct_answer": "B",
        "explanation": "'Meticulous' means showing great attention to detail; very careful and precise. 'Thorough' is the closest synonym.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 25,
        "is_premium": False,
        "source": "Campus Placement Verbal 2024",
    },
    {
        "category": "Verbal Ability",
        "topic": "Sentence Correction",
        "question_text": "Identify the grammatically correct sentence:",
        "option_a": "Neither of the two candidates have submitted their resumes.",
        "option_b": "Neither of the two candidates has submitted his resume.",
        "option_c": "Neither of the two candidate have submitted his resume.",
        "option_d": "Neither of the two candidate has submitted their resume.",
        "correct_answer": "B",
        "explanation": "'Neither' as a singular indefinite pronoun takes the singular verb 'has' and singular pronoun 'his/her'.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 40,
        "is_premium": False,
        "source": "AMCAT Verbal Test 2024",
    },
    {
        "category": "Verbal Ability",
        "topic": "Error Detection",
        "question_text": "Find the part with an error: 'Scarcely had the speaker (A) / finished his presentation (B) / than the audience began (C) / applauding enthusiastically (D).'",
        "option_a": "A",
        "option_b": "B",
        "option_c": "C",
        "option_d": "D",
        "correct_answer": "C",
        "explanation": "The correlative conjunction for 'Scarcely had...' is 'when' or 'before', NOT 'than' ('than' is used with 'No sooner'). Part C must be 'when the audience began'.",
        "difficulty": Difficulty.HARD,
        "estimated_time_seconds": 60,
        "is_premium": False,
        "source": "eLitmus Verbal Bank",
    },
    {
        "category": "Verbal Ability",
        "topic": "Antonyms",
        "question_text": "Choose the word opposite in meaning to 'CANDID':",
        "option_a": "Frank",
        "option_b": "Deceptive",
        "option_c": "Blunt",
        "option_d": "Earnest",
        "correct_answer": "B",
        "explanation": "'Candid' means truthful and straightforward. 'Deceptive' is its direct opposite.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 20,
        "is_premium": False,
        "source": "Placement English 2024",
    },
    {
        "category": "Verbal Ability",
        "topic": "Fill in the Blanks",
        "question_text": "Despite facing severe financial hurdles, the startup team ________ and launched their flagship software on schedule.",
        "option_a": "persevered",
        "option_b": "hesitated",
        "option_c": "relented",
        "option_d": "faltered",
        "correct_answer": "A",
        "explanation": "'Persevered' means continued in a course of action even in the face of difficulty with little or no prospect of success.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Campus Placement Verbal",
    },
    {
        "category": "Verbal Ability",
        "topic": "Vocabulary",
        "question_text": "What is the meaning of the word 'PRAGMATIC'?",
        "option_a": "Theoretical and abstract",
        "option_b": "Dealing with things sensibly and realistically",
        "option_c": "Excessively emotional",
        "option_d": "Unpredictable and impulsive",
        "correct_answer": "B",
        "explanation": "'Pragmatic' means dealing with problems in a practical, realistic way rather than relying on abstract theories.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 25,
        "is_premium": False,
        "source": "Verbal Aptitude Series",
    },
    {
        "category": "Verbal Ability",
        "topic": "Grammar",
        "question_text": "Choose the correct preposition: 'The candidate is eligible _______ the junior software developer position.'",
        "option_a": "of",
        "option_b": "with",
        "option_c": "for",
        "option_d": "to",
        "correct_answer": "C",
        "explanation": "The correct idiom is 'eligible for' a post or opportunity.",
        "difficulty": Difficulty.EASY,
        "estimated_time_seconds": 15,
        "is_premium": False,
        "source": "Campus Verbal Prep",
    },
    {
        "category": "Verbal Ability",
        "topic": "Para Jumbles",
        "question_text": "Arrange the sentences into a coherent paragraph: P: However, automation is transforming these roles rapidly. Q: Many students aim for entry-level programming jobs. R: Therefore, continuous upskilling in modern tech is essential. S: These positions once offered long-term stability.",
        "option_a": "Q - S - P - R",
        "option_b": "Q - P - S - R",
        "option_c": "S - Q - P - R",
        "option_d": "P - R - Q - S",
        "correct_answer": "A",
        "explanation": "Q introduces the goal (programming jobs), S comments on how those positions were viewed historically, P introduces the contrast ('However, automation...'), and R concludes logically ('Therefore...'). Hence Q-S-P-R.",
        "difficulty": Difficulty.HARD,
        "estimated_time_seconds": 60,
        "is_premium": False,
        "source": "TCS Verbal Placement Test",
    },
    {
        "category": "Verbal Ability",
        "topic": "Reading Comprehension",
        "question_text": "According to the passage, if an author argues that 'resilience is forged through deliberate adversity rather than sheltered comfort', which statement aligns best?",
        "option_a": "Comfort guarantees emotional strength.",
        "option_b": "Overcoming structured challenges fosters psychological endurance.",
        "option_c": "Adversity should always be avoided in modern education.",
        "option_d": "Resilience is purely an inherited genetic trait.",
        "correct_answer": "B",
        "explanation": "'Forged through deliberate adversity' directly equates to building strength by overcoming intentional, structured challenges.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 45,
        "is_premium": False,
        "source": "Infosys Reading Comprehension",
    },
    {
        "category": "Verbal Ability",
        "topic": "Sentence Correction",
        "question_text": "Choose the correctly punctuated sentence:",
        "option_a": "The project was delayed, however the team delivered quality work.",
        "option_b": "The project was delayed; however, the team delivered quality work.",
        "option_c": "The project was delayed: however the team delivered quality work.",
        "option_d": "The project was delayed however, the team delivered quality work.",
        "correct_answer": "B",
        "explanation": "When connecting two independent clauses with a conjunctive adverb like 'however', use a semicolon before 'however' and a comma after it.",
        "difficulty": Difficulty.MEDIUM,
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Campus Placement Grammar",
    },
]

DEFAULT_TESTS = [
    {
        "name": "Free Placement Diagnostic Test",
        "description": "Full 20-question mixed aptitude test covering Quantitative Aptitude, Logical Reasoning, and Verbal Ability under standard 15-minute campus placement time limits. Receive instant feedback on speed, accuracy, and weak topics.",
        "question_count": 20,
        "duration_seconds": 900,  # 15 mins
        "category_name": None,
        "topic_name": None,
        "difficulty": None,
        "is_free": True,
        "is_premium": False,
        "price_inr": 0,
        "negative_marking_ratio": 0.0,
        "status": TestStatus.PUBLISHED,
    },
    {
        "name": "Quantitative Aptitude Speed Test",
        "description": "10 timed questions focused on arithmetic, percentages, ratios, and time-work to build fast calculation reflexes under placement pressure.",
        "question_count": 10,
        "duration_seconds": 600,  # 10 mins
        "category_name": "Quantitative Aptitude",
        "topic_name": None,
        "difficulty": Difficulty.MEDIUM,
        "is_free": False,
        "is_premium": True,
        "price_inr": 10,
        "negative_marking_ratio": 0.0,
        "status": TestStatus.PUBLISHED,
    },
    {
        "name": "Logical Reasoning Placement Sprint",
        "description": "10 questions evaluating number series, pattern coding, direction sense, and critical deductive puzzles commonly asked in Tier-1 IT placement drives.",
        "question_count": 10,
        "duration_seconds": 600,  # 10 mins
        "category_name": "Logical Reasoning",
        "topic_name": None,
        "difficulty": Difficulty.MEDIUM,
        "is_free": False,
        "is_premium": True,
        "price_inr": 10,
        "negative_marking_ratio": 0.0,
        "status": TestStatus.PUBLISHED,
    },
    {
        "name": "Verbal Ability Placement Assessment",
        "description": "10 questions testing grammar precision, sentence correction, synonyms, and error detection essential for clearing verbal cutoffs in placement tests.",
        "question_count": 10,
        "duration_seconds": 600,  # 10 mins
        "category_name": "Verbal Ability",
        "topic_name": None,
        "difficulty": Difficulty.MEDIUM,
        "is_free": False,
        "is_premium": True,
        "price_inr": 10,
        "negative_marking_ratio": 0.0,
        "status": TestStatus.PUBLISHED,
    },
    {
        "name": "Technical CS/IT Foundations - Easy",
        "description": "Essential campus placement questions covering C language syntax, variable scoping, pointers, and function returns.",
        "question_count": 10,
        "duration_seconds": 600,
        "category_name": "Technical CS/IT",
        "topic_name": None,
        "difficulty": Difficulty.EASY,
        "is_free": True,
        "is_premium": False,
        "price_inr": 0,
        "negative_marking_ratio": 0.0,
        "status": TestStatus.PUBLISHED,
    },
    {
        "name": "TCS Technical C/C++ & OOPs Challenge",
        "description": "Core technical test evaluating C/C++ pointers, compound statements, memory allocation, and object-oriented paradigms.",
        "question_count": 10,
        "duration_seconds": 600,
        "category_name": "Technical CS/IT",
        "topic_name": None,
        "difficulty": Difficulty.MEDIUM,
        "is_free": False,
        "is_premium": True,
        "price_inr": 10,
        "negative_marking_ratio": 0.0,
        "status": TestStatus.PUBLISHED,
    },
]


def seed_database(db: Session) -> None:
    settings = get_settings()

    # 1. Seed or update initial admin user
    admin_email = (settings.initial_admin_email or "admin@aptitudearena.com").strip().lower()
    admin_user = db.scalar(select(User).where(User.email == admin_email))
    if not admin_user:
        admin_user = User(
            email=admin_email,
            password_hash=hash_password("Admin@AptitudeArena2026"),
            full_name="AptitudeArena Administrator",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin_user)
        db.flush()
        logger.info(f"Created initial admin user: {admin_email}")
    else:
        if admin_user.role != UserRole.ADMIN:
            admin_user.role = UserRole.ADMIN
            logger.info(f"Upgraded user {admin_email} to ADMIN")

    # 2. Seed taxonomy categories and topics
    category_map: dict[str, Category] = {}
    topic_map: dict[tuple[str, str], Topic] = {}

    for cat_name, cat_data in INITIAL_CATEGORIES_DATA.items():
        category = db.scalar(select(Category).where(Category.name == cat_name))
        if not category:
            category = Category(name=cat_name, slug=cat_data["slug"])
            db.add(category)
            db.flush()
            logger.info(f"Added Category: {cat_name}")
        category_map[cat_name] = category

        for topic_name, topic_slug in cat_data["topics"]:
            topic = db.scalar(
                select(Topic).where(Topic.category_id == category.id, Topic.name == topic_name)
            )
            if not topic:
                topic = Topic(category_id=category.id, name=topic_name, slug=topic_slug)
                db.add(topic)
                db.flush()
                logger.info(f"  Added Topic: {topic_name} (Category: {cat_name})")
            topic_map[(cat_name, topic_name)] = topic

    db.commit()

    # 3. Seed expanded questions
    questions_added = 0
    for q in EXPANDED_QUESTIONS:
        category = category_map[q["category"]]
        topic = topic_map[(q["category"], q["topic"])]

        existing = db.scalar(
            select(Question).where(
                Question.category_id == category.id,
                Question.topic_id == topic.id,
                Question.question_text == q["question_text"],
            )
        )
        if not existing:
            question = Question(
                question_text=q["question_text"],
                option_a=q["option_a"],
                option_b=q["option_b"],
                option_c=q["option_c"],
                option_d=q["option_d"],
                correct_answer=q["correct_answer"],
                explanation=q["explanation"],
                category_id=category.id,
                topic_id=topic.id,
                difficulty=q["difficulty"],
                estimated_time_seconds=q["estimated_time_seconds"],
                is_premium=q["is_premium"],
                is_active=True,
                source=q["source"],
            )
            db.add(question)
    # Also seed questions from dynamically ingested JSON catalog if available
    ingested_catalog_path = Path(__file__).resolve().parent.parent.parent / "data" / "ingested_questions.json"
    if ingested_catalog_path.exists():
        import json
        try:
            with open(ingested_catalog_path, "r", encoding="utf-8") as f:
                ingested_list = json.load(f)
            for item in ingested_list:
                cat_name = item.get("category_name", "Technical CS/IT")
                top_name = item.get("topic_name", "C & C++ Programming")

                cat_obj = category_map.get(cat_name)
                if not cat_obj:
                    cat_obj = db.scalar(select(Category).where(Category.name == cat_name))
                    if not cat_obj:
                        cat_slug = cat_name.lower().replace(" ", "-").replace("&", "and").replace("/", "-")
                        cat_obj = Category(name=cat_name, slug=cat_slug)
                        db.add(cat_obj)
                        db.flush()
                    category_map[cat_name] = cat_obj

                top_obj = topic_map.get((cat_name, top_name))
                if not top_obj:
                    top_obj = db.scalar(select(Topic).where(Topic.category_id == cat_obj.id, Topic.name == top_name))
                    if not top_obj:
                        top_slug = top_name.lower().replace(" ", "-").replace("&", "and").replace("/", "-")
                        top_obj = Topic(category_id=cat_obj.id, name=top_name, slug=top_slug)
                        db.add(top_obj)
                        db.flush()
                    topic_map[(cat_name, top_name)] = top_obj

                q_text = item.get("question_text", "").strip()
                if not q_text:
                    continue

                existing = db.scalar(select(Question).where(Question.question_text == q_text))
                if not existing:
                    diff_str = str(item.get("difficulty", "MEDIUM")).upper()
                    diff_enum = Difficulty.EASY if diff_str == "EASY" else Difficulty.HARD if diff_str == "HARD" else Difficulty.MEDIUM

                    db.add(
                        Question(
                            question_text=q_text,
                            option_a=item.get("option_a", ""),
                            option_b=item.get("option_b", ""),
                            option_c=item.get("option_c", ""),
                            option_d=item.get("option_d", ""),
                            correct_answer=item.get("correct_answer", "A"),
                            explanation=item.get("explanation", ""),
                            category_id=cat_obj.id,
                            topic_id=top_obj.id,
                            difficulty=diff_enum,
                            estimated_time_seconds=item.get("estimated_time_seconds", 45),
                            is_premium=item.get("is_premium", False),
                            is_active=True,
                            source=item.get("source", "Campus Placement Paper"),
                        )
                    )
                    questions_added += 1
            logger.info(f"Ingested catalog synced: processed {len(ingested_list)} questions from {ingested_catalog_path.name}")
        except Exception as e:
            logger.warning(f"Could not load ingested questions catalog: {e}")

    db.commit()
    logger.info(f"Questions synced: {questions_added} total new questions added.")

    # 4. Seed default published tests
    tests_added = 0
    for t_conf in DEFAULT_TESTS:
        existing_test = db.scalar(select(Test).where(Test.name == t_conf["name"]))
        cat = category_map.get(t_conf["category_name"]) if t_conf["category_name"] else None
        top = None

        if not existing_test:
            new_test = Test(
                name=t_conf["name"],
                description=t_conf["description"],
                question_count=t_conf["question_count"],
                duration_seconds=t_conf["duration_seconds"],
                category_id=cat.id if cat else None,
                topic_id=top.id if top else None,
                difficulty=t_conf["difficulty"],
                is_free=t_conf["is_free"],
                is_premium=t_conf["is_premium"],
                price_inr=t_conf["price_inr"],
                negative_marking_ratio=t_conf["negative_marking_ratio"],
                status=t_conf["status"],
            )
            db.add(new_test)
            tests_added += 1
        else:
            # Update price_inr and status if needed
            existing_test.price_inr = t_conf["price_inr"]
            existing_test.negative_marking_ratio = t_conf["negative_marking_ratio"]
            existing_test.status = t_conf["status"]

    db.commit()
    logger.info(f"Tests synced: {tests_added} new tests created.")

    # 5. Seed commercial products
    default_products = [
        {
            "name": "20 Question Test Pass",
            "description": "Unlock any 20-question category or topic placement sprint with full solutions.",
            "product_type": ProductType.TEST,
            "price_paise": 1000,  # ₹10
            "currency": "INR",
            "question_limit": 20,
            "duration_seconds": 900,
            "billing_interval_days": None,
            "is_active": True,
        },
        {
            "name": "Monthly Pro Subscription",
            "description": "Unlimited test attempts, premium placement questions, detailed solutions, and continuous performance analytics.",
            "product_type": ProductType.SUBSCRIPTION,
            "price_paise": 9900,  # ₹99
            "currency": "INR",
            "question_limit": None,
            "duration_seconds": None,
            "billing_interval_days": 30,
            "is_active": True,
        },
        {
            "name": "50 Question Mastery Pass",
            "description": "Comprehensive 50-question placement simulation for deep practice and endurance.",
            "product_type": ProductType.TEST,
            "price_paise": 2000,  # ₹20
            "currency": "INR",
            "question_limit": 50,
            "duration_seconds": 2400,
            "billing_interval_days": None,
            "is_active": True,
        },
    ]

    products_added = 0
    for p_conf in default_products:
        prod = db.scalar(select(Product).where(Product.name == p_conf["name"]))
        if not prod:
            prod = Product(**p_conf)
            db.add(prod)
            products_added += 1
        else:
            prod.description = p_conf["description"]
            prod.price_paise = p_conf["price_paise"]
            prod.question_limit = p_conf["question_limit"]
            prod.duration_seconds = p_conf["duration_seconds"]
            prod.billing_interval_days = p_conf["billing_interval_days"]
            prod.is_active = p_conf["is_active"]

    db.commit()
    logger.info(f"Products synced: {products_added} new products created.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
