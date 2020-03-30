from bs4 import BeautifulSoup
import requests
import difflib


def getRiddle() -> dict:
    '''Returns a dict of a riddle and its answer if the answer is
       two words or less'''

    page_link = 'https://riddles.fyi/random-riddles/'
    page_response = requests.get(page_link, timeout=5)
    page_content = BeautifulSoup(page_response.content, "html.parser")
    riddle_find = page_content.find("a", class_ = "query-title-link")
    riddle = str(riddle_find.text)
    answer_find = page_content.find("div", class_ = "su-spoiler-content su-clearfix")
    answer = str(answer_find.text)
    if len(answer.split()) > 3:
        return getRiddle()
    else:
        riddle_dict = {"Riddle": riddle, "Answer": answer}
        return riddle_dict

#def test_outputs() -> str:
#    x = getRiddle()
#    for r in x.values():
#        print(r)
print(getRiddle())

def allRiddles(ridict: dict, rounds: int) -> dict:
    '''Returns a dict with different riddles and no duplicates
       enough for however many rounds'''
    
    riddle = getRiddle()
    if len(ridict) == 0:
        ridict[riddle["Riddle"]] = riddle["Answer"]

    if len(ridict) == rounds:
        return ridict
    else:
        for key,value in riddle.items():
            if value in ridict.values():
                return allRiddles(ridict,rounds)
            else:
                ridict[riddle["Riddle"]] = riddle["Answer"]
                return allRiddles(ridict,rounds)

#def test_outputs2() -> str:
#    x = allRiddles(dict(),100)
#    for i in x.values():
#        print(i)

def correctAnswer(correct_input: str, user_input: str):
    '''Returns true if a user's input is correct'''
    
    user_list = [user_input]
    correct_input = correct_input.lower()
    correct = difflib.get_close_matches(correct_input, user_list,1,0.8)
    if len(correct) > 0:
        #print("True")
        return True
    else:
        #print("False")
        return False

#correctAnswer("TO GET to the OTHER side", "togettotheotherside")

