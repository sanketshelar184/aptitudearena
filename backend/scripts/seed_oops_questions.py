"""
Seed 30 High-Yield Campus Placement Questions for OOPs Concepts.
Covers: Classes, Objects, Inheritance, Polymorphism, Virtual Functions,
Constructors, Destructors, Encapsulation, Abstraction, Interfaces, and Memory.
Syncs to local SQLite (aptitude.db) and remote PostgreSQL/Neon if connected.
"""

import os
import sys
import uuid
from pathlib import Path
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

# Setup backend path
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.models.enums import Difficulty

OOPS_QUESTIONS = [
    {
        "question_text": "Which of the following OOP concepts is primarily achieved by using 'private' and 'protected' access specifiers to restrict direct access to object state?",
        "option_a": "Encapsulation",
        "option_b": "Polymorphism",
        "option_c": "Inheritance",
        "option_d": "Dynamic Binding",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Encapsulation is the mechanism of binding together the data (variables) and the functions that manipulate them, while restricting direct external access to internal components using access specifiers like private and protected.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "In C++, what problem is resolved by using 'virtual' inheritance (e.g., `class B : virtual public A`) in a multiple inheritance hierarchy?",
        "option_a": "The Dangling Pointer Problem",
        "option_b": "The Diamond Problem (Multipath Inheritance Ambiguity)",
        "option_c": "Memory Leakage in Dynamic Dispatch",
        "option_d": "Object Slicing",
        "correct_answer": "B",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "The Diamond Problem occurs when two classes B and C inherit from A, and class D inherits from both B and C. This results in two duplicate copies of class A inside D. Using 'virtual' base classes ensures that only a single shared instance of A is inherited by D.",
        "estimated_time_seconds": 45,
        "source": "TCS NQT / Infosys Technical Paper",
    },
    {
        "question_text": "What happens if a base class destructor is NOT declared as 'virtual' and a derived class object is deleted through a base class pointer (`Base* ptr = new Derived(); delete ptr;`)?",
        "option_a": "Compiler error at compile-time",
        "option_b": "Both base and derived destructors are called in reverse order",
        "option_c": "Only the base class destructor is called, causing resource/memory leaks in the derived class",
        "option_d": "Only the derived class destructor is called",
        "correct_answer": "C",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "If the base destructor is not virtual, the delete call uses static binding (early binding) matching the pointer type (Base). Therefore, only ~Base() is executed, and ~Derived() is skipped, leading to undefined behavior and resource/memory leaks.",
        "estimated_time_seconds": 45,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Which feature of OOP allows a function or operator to possess different implementations based on argument types or object classes at runtime or compile-time?",
        "option_a": "Polymorphism",
        "option_b": "Coupling",
        "option_c": "Cohesion",
        "option_d": "Composition",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Polymorphism means 'many forms'. It allows entities such as functions or operators to behave differently in different contexts (e.g. function overloading at compile time or method overriding with virtual functions at runtime).",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "A class containing at least one 'pure virtual function' (e.g., `virtual void draw() = 0;`) is known as:",
        "option_a": "A Concrete Class",
        "option_b": "An Abstract Class",
        "option_c": "A Sealed Class",
        "option_d": "A Static Class",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "An abstract class is a class that contains at least one pure virtual function. Abstract classes cannot be instantiated directly and are meant to act as base interfaces for derived classes to implement.",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is 'Object Slicing' in C++?",
        "option_a": "Allocating objects across non-contiguous memory segments",
        "option_b": "Assigning a derived class object to a base class object by value, stripping off derived class member attributes",
        "option_c": "Deleting an object through a void pointer",
        "option_d": "Splitting an object's member methods across multiple translation units",
        "correct_answer": "B",
        "difficulty": Difficulty.HARD,
        "explanation": "Object Slicing occurs when a derived class object is assigned or passed by value to a base class object. The base class copy constructor only copies the base portion, 'slicing off' all derived-specific state and polymorphic behavior.",
        "estimated_time_seconds": 50,
        "source": "TCS NQT / Infosys Technical Paper",
    },
    {
        "question_text": "Which of the following constructor types is called when an object is initialized with another existing object of the exact same class (`MyClass obj2 = obj1;`)?",
        "option_a": "Default Constructor",
        "option_b": "Copy Constructor",
        "option_c": "Conversion Constructor",
        "option_d": "Delegating Constructor",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "A copy constructor is a member function that initializes an object using another object of the same class. It has the signature `ClassName(const ClassName& other)`.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Why does a shallow copy cause a runtime error (such as a double-free crash) when an object holding dynamic memory is destroyed?",
        "option_a": "It copies pointer addresses rather than the underlying allocated heap data, causing both destructors to deallocate the same heap memory address",
        "option_b": "It invokes the base constructor twice",
        "option_c": "It sets all integer variables to negative infinity",
        "option_d": "It fails to allocate the vtable table pointer",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "A default shallow copy performs a bitwise copy of member variables. If a member is a pointer, only the pointer address is copied. When both objects go out of scope, their destructors attempt to free the exact same heap memory location, causing a double-free crash.",
        "estimated_time_seconds": 45,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is the key difference between Function Overloading and Function Overriding?",
        "option_a": "Overloading occurs in the same scope with different parameters (compile-time); Overriding occurs in derived classes with identical signatures (runtime)",
        "option_b": "Overloading requires virtual keywords; Overriding cannot use virtual keywords",
        "option_c": "Overloading happens at runtime; Overriding happens at compile-time",
        "option_d": "Overloading requires different return types only; Overriding ignores return types",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Function Overloading is compile-time polymorphism where functions in the same class share a name but differ in parameter count or types. Overriding is runtime polymorphism where a subclass provides a specific implementation of a virtual method declared in its superclass.",
        "estimated_time_seconds": 40,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Can a 'friend function' in C++ access the private and protected members of a class?",
        "option_a": "No, private members can never be accessed outside member methods",
        "option_b": "Yes, but only if the class is marked public",
        "option_c": "Yes, a friend function is explicitly granted access to private and protected members by the class declaration",
        "option_d": "Only protected members, not private members",
        "correct_answer": "C",
        "difficulty": Difficulty.EASY,
        "explanation": "A friend function is a non-member function that is declared with the 'friend' keyword inside a class definition, granting it full access to all private and protected members of that class.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is the role of the 'vptr' (Virtual Pointer) and 'vtable' (Virtual Table) in C++?",
        "option_a": "They allocate contiguous memory for arrays on the heap",
        "option_b": "They implement dynamic dispatch (runtime polymorphism) by storing pointers to virtual functions",
        "option_c": "They optimize inline function expansion at compile time",
        "option_d": "They prevent circular class dependencies",
        "correct_answer": "B",
        "difficulty": Difficulty.HARD,
        "explanation": "For any class with virtual functions, the compiler creates a static vtable containing function pointers to the most-derived implementations. Each object of that class contains an invisible pointer (vptr) pointing to this vtable, enabling runtime dynamic dispatch.",
        "estimated_time_seconds": 50,
        "source": "TCS NQT / Infosys Technical Paper",
    },
    {
        "question_text": "Which of the following OOP principles states that 'Subtypes must be substitutable for their base types without altering the correctness of the program'?",
        "option_a": "Single Responsibility Principle (SRP)",
        "option_b": "Liskov Substitution Principle (LSP)",
        "option_c": "Open/Closed Principle (OCP)",
        "option_d": "Interface Segregation Principle (ISP)",
        "correct_answer": "B",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "The Liskov Substitution Principle (the 'L' in SOLID) dictates that objects of a superclass should be replaceable with objects of a subclass without breaking application behavior or violating contract expectations.",
        "estimated_time_seconds": 35,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "In Java and C++, can a constructor be declared as 'virtual'?",
        "option_a": "Yes, in both languages",
        "option_b": "No, constructors cannot be virtual because an object's type and vtable pointer must be fully constructed before virtual dispatch can exist",
        "option_c": "Yes, in C++ but not in Java",
        "option_d": "Yes, provided it takes zero arguments",
        "correct_answer": "B",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Constructors cannot be virtual. When a constructor executes, the object is still in the process of being created; its virtual table pointer (vptr) is not yet pointed to the final derived class. Virtual calls require an already constructed object.",
        "estimated_time_seconds": 40,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is the order of constructor and destructor invocation when a Derived class object is instantiated and then destroyed?",
        "option_a": "Constructors: Base then Derived; Destructors: Derived then Base",
        "option_b": "Constructors: Derived then Base; Destructors: Base then Derived",
        "option_c": "Constructors: Base then Derived; Destructors: Base then Derived",
        "option_d": "Constructors: Derived then Base; Destructors: Derived then Base",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Constructors are invoked from the top of the hierarchy downwards (Base first, then Derived) to ensure base components are ready. Destructors execute in exact reverse order (Derived first, then Base) to cleanly release resources.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Which of the following describes the relationship in 'Composition' versus 'Aggregation'?",
        "option_a": "Composition implies weak ownership; Aggregation implies strong ownership",
        "option_b": "Composition represents a 'part-of' relationship where the child cannot exist independently of the parent; Aggregation represents a 'has-a' relationship where child lifecycle is independent",
        "option_c": "Composition is an 'is-a' relationship; Aggregation is a 'can-do' relationship",
        "option_d": "Both are strictly identical in memory layout and lifecycle management",
        "correct_answer": "B",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Composition is strong ownership (e.g. House and Rooms: if the House is destroyed, the Rooms cease to exist). Aggregation is weak ownership (e.g. Department and Professors: professors can exist independently of the department).",
        "estimated_time_seconds": 45,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is the 'this' pointer in C++?",
        "option_a": "A pointer to the parent base class",
        "option_b": "An implicit pointer passed to non-static member functions that holds the address of the invoking object",
        "option_c": "A pointer pointing to global namespace variables",
        "option_d": "A pointer to the virtual table",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "'this' is a constant pointer passed implicitly to all non-static member functions, storing the memory address of the object on which the member function was invoked.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Can static member functions in C++ access non-static class members directly without an object instance?",
        "option_a": "Yes, static functions have global access to all members",
        "option_b": "No, because static member functions do not receive an implicit 'this' pointer",
        "option_c": "Yes, if the non-static member is marked public",
        "option_d": "Only when compiled in release mode",
        "correct_answer": "B",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Static member functions belong to the class rather than to any specific instance. Because they have no 'this' pointer, they cannot access non-static instance variables or methods directly without being passed an explicit object reference.",
        "estimated_time_seconds": 35,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Which operator CANNOT be overloaded in C++?",
        "option_a": "`+` (Addition)",
        "option_b": "`[]` (Subscript)",
        "option_c": "`.` (Member Access) and `?:` (Ternary Conditional)",
        "option_d": "`==` (Equality)",
        "correct_answer": "C",
        "difficulty": Difficulty.EASY,
        "explanation": "In C++, the member access operator (`.`), pointer-to-member operator (`.*`), scope resolution operator (`::`), ternary conditional operator (`?:`), and `sizeof` operator cannot be overloaded.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is 'Early Binding' (Static Binding) in object-oriented programming?",
        "option_a": "Resolving method calls and function addresses at compile-time",
        "option_b": "Resolving method addresses at runtime based on the object's actual dynamic type",
        "option_c": "Initializing global variables before the main function starts",
        "option_d": "Binding garbage collector hooks during thread creation",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Early Binding (Static Binding) means the compiler matches the function call with its implementation at compile-time. Standard non-virtual functions and overloaded functions use early binding.",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "In Java, what is the purpose of the 'super' keyword?",
        "option_a": "To allocate memory in the PermGen space",
        "option_b": "To refer directly to the immediate parent class's fields, methods, or constructors",
        "option_c": "To prevent a class from being subclassed",
        "option_d": "To force garbage collection of an object",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "In Java, 'super' is a reference variable used to invoke the superclass constructor (`super()`), call superclass methods (`super.method()`), or access overridden superclass fields.",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What happens if a class in Java does not define any constructor?",
        "option_a": "Compilation error occurs",
        "option_b": "The compiler automatically generates a default no-argument constructor",
        "option_c": "The class can only be instantiated using reflection",
        "option_d": "Objects of the class cannot have any instance variables",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "If a class explicitly provides no constructors, the compiler automatically inserts a default no-argument constructor that calls `super()` to initialize the superclass.",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is the difference between an 'Abstract Class' and an 'Interface' in modern Java (Java 8+)?",
        "option_a": "An abstract class can maintain state (instance fields) and constructors, whereas an interface cannot hold instance state and supports multiple inheritance of type",
        "option_b": "Interfaces can never have any method implementations",
        "option_c": "Abstract classes support multiple inheritance; interfaces do not",
        "option_d": "Abstract classes cannot have concrete methods",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "While Java 8 introduced default and static methods in interfaces, interfaces still cannot maintain instance state (fields are implicitly public static final) nor have constructors. Abstract classes can have instance state, constructors, and private/protected methods.",
        "estimated_time_seconds": 45,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Which design pattern ensures a class has only one instance and provides a global access point to it?",
        "option_a": "Factory Pattern",
        "option_b": "Singleton Pattern",
        "option_c": "Observer Pattern",
        "option_d": "Adapter Pattern",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "The Singleton pattern restricts instantiation of a class to one single object and provides a global static access method (e.g., `getInstance()`).",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "In C++, what is a 'Copy Assignment Operator' vs a 'Copy Constructor'?",
        "option_a": "Copy constructor initializes a newly created object from an existing one; Copy assignment operator copies state into an already existing, initialized object",
        "option_b": "They are synonymous and call the exact same routine",
        "option_c": "Copy assignment operator only works on primitive types",
        "option_d": "Copy constructor cannot be overloaded",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "`MyClass a = b;` invokes the Copy Constructor (creating object 'a'). `a = b;` (when 'a' already exists) invokes the Copy Assignment Operator `operator=`, which must also handle self-assignment and clean up existing allocated resources.",
        "estimated_time_seconds": 40,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "In object-oriented design, what is 'High Cohesion' and 'Low Coupling'?",
        "option_a": "High Cohesion means classes have closely related, focused responsibilities; Low Coupling means classes have minimal dependencies on each other",
        "option_b": "High Cohesion means many classes depend on each other; Low Coupling means a class does everything",
        "option_c": "High Cohesion refers to database normalization; Low Coupling refers to network bandwidth",
        "option_d": "Both mean maximizing global variable usage across modules",
        "correct_answer": "A",
        "difficulty": Difficulty.MEDIUM,
        "explanation": "Good OOP architecture strives for High Cohesion (each module/class focuses strictly on a single well-defined task) and Low Coupling (modules interact through clean interfaces with minimal direct internal knowledge of each other).",
        "estimated_time_seconds": 35,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "What is the purpose of the 'final' keyword applied to a method in Java?",
        "option_a": "It prevents the method from being called more than once",
        "option_b": "It prevents the method from being overridden by any subclass",
        "option_c": "It forces the method to be executed in a separate thread",
        "option_d": "It marks the method as pure virtual",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "Declaring a method as 'final' in Java guarantees that subclasses cannot override or modify its implementation, securing critical logic from being altered.",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Which of the following is true regarding 'Downcasting' in C++ (`dynamic_cast<Derived*>(base_ptr)`)?",
        "option_a": "It requires the base class to have at least one virtual function for RTTI (Run-Time Type Information) check; returns nullptr on failed pointer cast",
        "option_b": "It is always completely evaluated at compile time",
        "option_c": "It never fails and never returns null",
        "option_d": "It converts a derived class pointer to a base class pointer",
        "correct_answer": "A",
        "difficulty": Difficulty.HARD,
        "explanation": "Downcasting casts a base class pointer/reference to a derived class pointer/reference. `dynamic_cast` relies on RTTI (requiring at least one virtual function in the base class) and safely returns `nullptr` if the underlying object is not of the requested derived type.",
        "estimated_time_seconds": 50,
        "source": "TCS NQT / Infosys Technical Paper",
    },
    {
        "question_text": "What is an 'explicit constructor' in C++ (`explicit MyClass(int x)`)?",
        "option_a": "A constructor that must be called manually from main",
        "option_b": "A constructor that prevents the compiler from performing implicit type conversions and copy-initialization",
        "option_c": "A constructor that cannot accept any parameters",
        "option_d": "A constructor that allocates memory exclusively on the heap",
        "correct_answer": "B",
        "difficulty": Difficulty.HARD,
        "explanation": "Single-parameter constructors in C++ can act as implicit conversion constructors (e.g. `MyClass obj = 10;`). Adding the 'explicit' prefix prevents unintended automatic type conversions, forcing explicit syntax like `MyClass obj(10);`.",
        "estimated_time_seconds": 45,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "In Java, what does the '@Override' annotation do?",
        "option_a": "It changes a private method to public",
        "option_b": "It causes a compile-time check ensuring the annotated method genuinely overrides a method in a superclass or interface",
        "option_c": "It enables runtime multithreading for the method",
        "option_d": "It creates a virtual table entry",
        "correct_answer": "B",
        "difficulty": Difficulty.EASY,
        "explanation": "The `@Override` annotation instructs the Java compiler to verify that the method correctly matches the signature of a superclass or interface method. If there is a typo in method name or parameters, the compiler produces an immediate error.",
        "estimated_time_seconds": 25,
        "source": "Campus Placement Technical Core - OOPs",
    },
    {
        "question_text": "Why is 'Multiple Inheritance' of classes not directly supported in Java, while supported through interfaces?",
        "option_a": "To avoid complexity and ambiguity caused by the Diamond Problem (duplicate state and method conflict from multiple class parents)",
        "option_b": "Because interfaces require less RAM than classes",
        "option_c": "Because Java does not have garbage collection for multiple base classes",
        "option_d": "Because Java virtual machine cannot load more than one class file at once",
        "correct_answer": "A",
        "difficulty": Difficulty.EASY,
        "explanation": "Java avoids multiple class inheritance to eliminate the Diamond Problem where two parent classes define conflicting state or implementations. Interfaces avoid state conflict because they define behavior/types rather than instance variable state.",
        "estimated_time_seconds": 30,
        "source": "Campus Placement Technical Core - OOPs",
    },
]


def seed_oops():
    sqlite_path = BACKEND_DIR / "aptitude.db"
    print(f"Connecting to SQLite: {sqlite_path}")
    engine = create_engine(f"sqlite:///{sqlite_path}")

    with Session(engine) as db:
        # Find Technical CS/IT and OOPs Concepts
        cat = db.scalar(select(Category).where(Category.name == "Technical CS/IT"))
        top = db.scalar(select(Topic).where(Topic.name == "OOPs Concepts"))

        if not cat or not top:
            print(f"Error: Category or Topic not found! Cat: {cat}, Top: {top}")
            return

        print(f"Found Category: {cat.name} ({cat.id})")
        print(f"Found Topic: {top.name} ({top.id})")

        added = 0
        for q_data in OOPS_QUESTIONS:
            # Check duplicate by question text
            existing = db.scalar(
                select(Question).where(
                    Question.topic_id == top.id,
                    Question.question_text == q_data["question_text"],
                )
            )
            if not existing:
                q = Question(
                    id=uuid.uuid4(),
                    question_text=q_data["question_text"],
                    option_a=q_data["option_a"],
                    option_b=q_data["option_b"],
                    option_c=q_data["option_c"],
                    option_d=q_data["option_d"],
                    correct_answer=q_data["correct_answer"],
                    explanation=q_data["explanation"],
                    category_id=cat.id,
                    topic_id=top.id,
                    difficulty=q_data["difficulty"],
                    estimated_time_seconds=q_data["estimated_time_seconds"],
                    is_premium=False,
                    is_active=True,
                    source=q_data["source"],
                )
                db.add(q)
                added += 1

        db.commit()
        total_in_topic = db.scalar(
            select(text("count(*)")).select_from(Question).where(Question.topic_id == top.id)
        )
        print(f"Successfully added {added} new OOPs questions to SQLite! Total in topic now: {total_in_topic}")


if __name__ == "__main__":
    seed_oops()

