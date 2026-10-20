import os
import sys
import uuid
from pathlib import Path
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.models.enums import Difficulty

PL_QUESTIONS = [
    {
        "question_text": "A trader marks his goods at 20% above the cost price. If he allows a discount of 10% for cash payment, what is his gain percentage?",
        "option_a": "8%",
        "option_b": "10%",
        "option_c": "12%",
        "option_d": "15%",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Let CP = 100. Marked Price (MP) = 100 + 20% of 100 = 120. Selling Price (SP) = 120 - 10% of 120 = 120 - 12 = 108. Gain% = ((108 - 100)/100) * 100 = 8%.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "If the cost price of 12 pens is equal to the selling price of 8 pens, find the gain percentage.",
        "option_a": "33.33%",
        "option_b": "50%",
        "option_c": "25%",
        "option_d": "66.67%",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "Let CP of 1 pen = Re 1. CP of 8 pens = Rs 8. SP of 8 pens = CP of 12 pens = Rs 12. Gain = 12 - 8 = Rs 4. Gain% = (4 / 8) * 100 = 50%.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A man buys an article for Rs. 27.50 and sells it for Rs. 28.60. Find his gain percentage.",
        "option_a": "4%",
        "option_b": "5%",
        "option_c": "6%",
        "option_d": "3.5%",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "CP = 27.50, SP = 28.60. Gain = 28.60 - 27.50 = 1.10. Gain% = (1.10 / 27.50) * 100 = 4%.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "If a radio is sold for Rs. 490 and its cost price is Rs. 465.50, find the profit percentage.",
        "option_a": "5.26%",
        "option_b": "4.85%",
        "option_c": "6.12%",
        "option_d": "5.5%",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Profit = 490 - 465.50 = Rs. 24.50. Profit% = (24.50 / 465.50) * 100 = 5.26%.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A cycle was sold at a loss of 10%. If it had been sold for Rs. 65 more, there would have been a gain of 10%. What was the cost price of the cycle?",
        "option_a": "Rs. 325",
        "option_b": "Rs. 300",
        "option_c": "Rs. 350",
        "option_d": "Rs. 400",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Difference between 10% gain and 10% loss = 20% of CP. 20% of CP = Rs. 65. CP = (65 * 100) / 20 = Rs. 325.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A dishonest dealer professes to sell his goods at cost price, but he uses a weight of 960 grams for 1 kg. Find his gain percentage.",
        "option_a": "4.16%",
        "option_b": "4%",
        "option_c": "4.35%",
        "option_d": "5%",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Gain% = [Error / (True Value - Error)] * 100 = [40 / (1000 - 40)] * 100 = (40 / 960) * 100 = 4.166% or 4 1/6%.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A shopkeeper sells two articles at Rs. 1000 each. On one he gains 20% and on the other he loses 20%. What is his overall gain or loss percentage?",
        "option_a": "4% loss",
        "option_b": "4% gain",
        "option_c": "No profit no loss",
        "option_d": "2% loss",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "When two articles are sold at the same price with one at x% gain and other at x% loss, overall is always a loss of (x/10)^2%. Here (20/10)^2% = 4% loss.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "By selling a watch for Rs. 144, a person gains such that the percentage gain equals the cost price in rupees. What is the cost price?",
        "option_a": "Rs. 80",
        "option_b": "Rs. 75",
        "option_c": "Rs. 90",
        "option_d": "Rs. 60",
        "correct_answer": "A",
        "difficulty": Difficulty.HARD,
        "explanation": "Let CP = x. Gain% = x%. SP = x + (x/100)*x = 144 => x^2 + 100x - 14400 = 0. Solving: (x + 180)(x - 80) = 0 => x = 80.",
        "estimated_time_seconds": 60,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "An article is sold at a discount of 20% on the marked price and still yields a profit of 25%. If the cost price is Rs. 480, find the marked price.",
        "option_a": "Rs. 750",
        "option_b": "Rs. 720",
        "option_c": "Rs. 800",
        "option_d": "Rs. 650",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "SP = 480 * 1.25 = Rs. 600. Discount = 20%, so SP = 0.80 * MP = 600 => MP = 600 / 0.80 = Rs. 750.",
        "estimated_time_seconds": 50,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A fruit seller bought 15 apples for Rs. 12 and sold 12 apples for Rs. 15. What is his profit percentage?",
        "option_a": "56.25%",
        "option_b": "50%",
        "option_c": "45%",
        "option_d": "60%",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "CP of 1 apple = 12/15 = 0.80. SP of 1 apple = 15/12 = 1.25. Profit = 1.25 - 0.80 = 0.45. Profit% = (0.45 / 0.80) * 100 = 56.25%.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "By selling 33 meters of cloth, a merchant gains the selling price of 11 meters. Find the gain percentage.",
        "option_a": "50%",
        "option_b": "33.33%",
        "option_c": "25%",
        "option_d": "40%",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Gain = SP of 11m = SP of 33m - CP of 33m => CP of 33m = SP of 22m. Let SP of 1m = Re 1. CP of 33m = Rs 22. Profit on 22 = 11 => Profit% = (11/22) * 100 = 50%.",
        "estimated_time_seconds": 40,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "If the marked price of an item is Rs. 250 and it is sold for Rs. 200, what is the discount percentage?",
        "option_a": "20%",
        "option_b": "25%",
        "option_c": "15%",
        "option_d": "18%",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Discount = 250 - 200 = Rs. 50. Discount% = (50 / 250) * 100 = 20%.",
        "estimated_time_seconds": 25,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A man sold two books for Rs. 240 each. On one he made a profit of 20% and on the other he lost 20%. What was his net profit or loss in rupees?",
        "option_a": "Loss of Rs. 20",
        "option_b": "Loss of Rs. 16",
        "option_c": "Profit of Rs. 20",
        "option_d": "No profit no loss",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Total SP = 240 + 240 = 480. CP1 = 240 / 1.2 = 200. CP2 = 240 / 0.8 = 300. Total CP = 200 + 300 = 500. Net Loss = 500 - 480 = Rs. 20.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A shopkeeper buys an article at 4/5 of its value and sells it for 20% more than its value. What is his profit percentage?",
        "option_a": "50%",
        "option_b": "40%",
        "option_c": "45%",
        "option_d": "60%",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Let value = 100. CP = (4/5)*100 = 80. SP = 100 + 20 = 120. Profit = 120 - 80 = 40. Profit% = (40 / 80) * 100 = 50%.",
        "estimated_time_seconds": 40,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "Successive discounts of 10% and 20% are equivalent to a single discount of:",
        "option_a": "28%",
        "option_b": "30%",
        "option_c": "25%",
        "option_d": "27%",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Equivalent discount = (d1 + d2 - (d1*d2)/100)% = 10 + 20 - (10*20)/100 = 30 - 2 = 28%.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A person incurs a 5% loss by selling a watch for Rs. 1140. At what price should the watch be sold to earn a 5% profit?",
        "option_a": "Rs. 1260",
        "option_b": "Rs. 1200",
        "option_c": "Rs. 1300",
        "option_d": "Rs. 1250",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Let CP = 100. 95% of CP = 1140 => CP = (1140 / 95) * 100 = 1200. To earn 5% profit: SP = 1200 * 1.05 = Rs. 1260.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A dealer sells an article at 6% loss. If he had sold it for Rs. 64 more, he would have made a 10% profit. What is the cost price?",
        "option_a": "Rs. 400",
        "option_b": "Rs. 450",
        "option_c": "Rs. 500",
        "option_d": "Rs. 380",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Difference between 10% gain and 6% loss = 16% of CP. 16% of CP = 64 => CP = (64 * 100) / 16 = Rs. 400.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A merchant marks his goods 40% above cost price and allows a 25% discount. What is his profit percentage?",
        "option_a": "5%",
        "option_b": "10%",
        "option_c": "15%",
        "option_d": "8%",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Let CP = 100. MP = 140. SP = 140 * (1 - 0.25) = 140 * 0.75 = 105. Profit = 105 - 100 = 5%.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "If 5% more is gained by selling a table for Rs. 350 than by selling it for Rs. 340, the cost price of the table is:",
        "option_a": "Rs. 200",
        "option_b": "Rs. 250",
        "option_c": "Rs. 180",
        "option_d": "Rs. 220",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Difference in SP = 350 - 340 = Rs. 10. 5% of CP = 10 => CP = (10 * 100) / 5 = Rs. 200.",
        "estimated_time_seconds": 30,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    },
    {
        "question_text": "A milkman purchases milk at Rs. 20 per litre and mixes 1/4 water with it. If he sells the mixture at Rs. 20 per litre, what is his profit percentage?",
        "option_a": "25%",
        "option_b": "20%",
        "option_c": "30%",
        "option_d": "15%",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Let he buys 4 litres of milk for Rs. 80. He adds 1 litre of water (cost = 0), making total volume = 5 litres. He sells 5 litres at Rs. 20/litre = Rs. 100. Profit = 100 - 80 = Rs. 20. Profit% = (20 / 80) * 100 = 25%.",
        "estimated_time_seconds": 45,
        "source": "Placement Quantitative Aptitude - Profit & Loss",
    }
]

def seed_db(db_url: str, label: str):
    print(f"Connecting to {label}...")
    try:
        engine = create_engine(db_url)
        with Session(engine) as db:
            topic = db.scalar(select(Topic).where(Topic.name == "Profit & Loss"))
            if not topic:
                print(f"[{label}] Profit & Loss topic not found!")
                return
            
            cat_id = topic.category_id
            added = 0
            for item in PL_QUESTIONS:
                exists = db.scalar(
                    select(Question).where(
                        Question.topic_id == topic.id,
                        Question.question_text == item["question_text"]
                    )
                )
                if not exists:
                    q = Question(
                        id=uuid.uuid4(),
                        category_id=cat_id,
                        topic_id=topic.id,
                        question_text=item["question_text"],
                        option_a=item["option_a"],
                        option_b=item["option_b"],
                        option_c=item["option_c"],
                        option_d=item["option_d"],
                        correct_answer=item["correct_answer"],
                        explanation=item["explanation"],
                        difficulty=item["difficulty"],
                        estimated_time_seconds=item["estimated_time_seconds"],
                        is_premium=False,
                        is_active=True,
                        source=item["source"]
                    )
                    db.add(q)
                    added += 1
            db.commit()
            all_qs = list(db.scalars(select(Question).where(Question.topic_id == topic.id, Question.is_active.is_(True))).all())
            print(f"[{label}] Added {added} questions. Total active questions now: {len(all_qs)}")
    except Exception as e:
        print(f"[{label}] Error: {e}")

if __name__ == "__main__":
    from app.core.config import get_settings
    settings = get_settings()
    
    # 1. Local SQLite
    sqlite_path = BACKEND_DIR / "aptitude.db"
    seed_db(f"sqlite:///{sqlite_path}", "Local SQLite")
    
    # 2. Remote PostgreSQL
    if settings.database_url:
        seed_db(settings.database_url, "PostgreSQL/Neon")

