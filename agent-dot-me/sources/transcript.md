Unknown 0:00
Interesting, but it's okay, all right, yeah, so, I mean, I think, I mean, I guess the question is, what's our objective? And I think when I think about it, in a lot of ways, our objective is to sort of spec out something.

Unknown 0:03


Unknown 0:21
I mean, we could, you know, try building something, but I don't think we really have buckets of time for that. But in some sense, writing the spec is building something these days. So Exactly, yeah, so if we, if we thought about our goal, is to, you know, articulate, you know, like, what would it be to have some kind of mechanism for user privacy and user primacy.

Unknown 0:46
What would that look like? What would be some of the key characteristics that we want to have in there? And and then that includes that does kind of touch on stuff like the Enclave we've talked about, talks about private communications. It brings in the sort of question of, you know, how much you know? What are the actual existing mechanisms for privacy anyway? I guess I don't you know whoever wants to take it away. So I love to have people who know more about this than me. Sometimes, in the beginning, it's good to do requirements and, yes,

Unknown 1:22
okay, yes, I will take it away. Why don't you lead us? Mallory, I

Unknown 1:31
have a question about requirements. So it do are we thinking of this as like a personal sovereign agent, or is the the interaction pattern that was described in Marcus's presentation, where, like, my agent goes and communicates with another person or a vendor's agent, and they exchange information in a secure context, and then after that interaction, that data about the exchange is like, thrown away. Is that? Is that the important part of this, or is it just come up with use cases too. That's another exercise where we kind of figure out what's the space we want to try to capture. So I think that one requirement is that there should exist a private enclave, but there should also exist for agent. That's a tool. Yeah? That's one, yeah. There should also exist a like, like, way to share like, in the sense of you might want portability and

Unknown 2:22
also learning of the society at large. Like the whole, how can I learn from your interaction with someone else? Maybe training. Do you mean when you say learning? Do you mean training of agent? No. I mean, like, kind of society's work because we've developed trust and reputation and like, okay, so reputation, yeah, so something needs to enable that, which could be like, Okay, I can read the transcript that you have with vendor, so and so, and realize something from it, okay, or like that. I can trust that my agent is really communicating with, like, some some brands, like, whatever, yeah, close agents or BMWs agents. Whenever I'm trying to do something partial disclosure, maybe is what I'm hearing like, you can share some, all or none, like, yeah, you also need to make sure the agents actually ground them in the context. So like, for example, something about company policies, right there? Company policies when I think about a me agent. So I was first when notebook LM came out, I thought they were going to take it in a direction that really made sense. Okay. I have my Google Drive. It has permissions.

Unknown 3:10


Unknown 3:28


Unknown 3:30


Unknown 3:42
It has folders where I've organized things. I share folders with a group, with this person versus that person with this group. So there's a bunch of group forming capabilities. There's a bunch of my private data, a bunch of shared data with other people under user control and and then you're able to point, you know, my, wow,

Unknown 4:06
they've consumerized rag you know, I can point right something at a block of my personal data and have an AI that says, Okay, I'm going to use this as my context, and it's already chunked up. It's already chunked up because it's sort of how I've organized it in my life. And, you know, so there's a, you know, like, when I sort of my dream vision of my me agent is one, is probably this a bunch of sub agents, you know, sort of like, okay, so let's just say that, you know, Gmail does do a decent job on their personal intelligence, you know, and it actually allows me access to my my mail, so that I can actually find things and search things. And that would be that would potentially be a sub agent that I would want to call. I don't know that I would want to, you know, I'm not expecting to load my, you know how 15 years of Gmail into Claude and something about the agent to user, that it's representing interface. So like feedback, or like the prototypes we've built at Microsoft have a lot of dashboards. So like, I can see what other people are interested in about me, which might influence feedback.

Unknown 5:20


Unknown 5:23
Yeah, yeah. Like, so in particular, I get to use it. So right now I publish a paper. People read it. I don't know what they misunderstood, or what they have questions about whether she asked my knee agent. I can then understand, oh, I need to, like, really explain that. Better reputation. Feedback. One thing that board just supposedly isn't it, isn't it a sign of, like, interest or preferences, as opposed to feedback? Yeah, it could be, yeah. I don't know what to call it, but it has an element of we can what are people

Unknown 6:00
interested question of reputation in the sense of, we used to talk about reputation systems, and we don't really use that term anymore,

Unknown 6:09
but it is a lot of things that we think of, likes number of subscribers, they're all reputation you know, systems in some sense.

Unknown 6:25
And you know, page rank is a reputation system. Anyway, I'm just thinking about what's, what's, what, what is, you know, what is the represent, you know, the reputation of an agent will, I think, eventually come to be meaningful?

Unknown 6:41
Already, it's people talking about it a lot, yeah, yeah. Anyway, I was also just thinking about, you know, back to the sub aging thing. I'm also just thinking about, you know, to the notebook LM example,

Unknown 6:53
there's, you know, I think about, when I think about, you know, my personal, you know, production of artifacts. Some of them I am perfectly happy to point to by reference. Other ones, you know, might want to be by value, you know. So like, I can go, here's myself, you know, like, I publish on this sub stack. I publish on this sub stack, yeah, I don't need to include all those. But I, for example, I want to point, I have a, you know, a set of folders that I want to point into on my personal machine, or I want to have it point to my, my Claude conversation history, anyway, just sort of thinking about, what's the architecture by which you can point to things that you want to be Yeah, potentially available to be brought into context. Do you do once you bring them in, can you take them out? Is it persistent? Is it open? Is it fetching rather than Yeah, it's no. There's a lot of questions, but Yeah,

Unknown 7:49
the question also, and I just think about, what are the user affordances for understanding and controlling what they you know, what their AI agent knows about that.

Unknown 8:03
So what it knows about everybody else? Like, I think there needs to be something like as a requirement, and some kind of contact card enrolled social network. Yeah, network is good. So, like, personal sense, not in the internet sense.

Unknown 8:19
I think disclosure cards are kind of like an interesting artifact. Like, it's not just for like, this is what the agent knows or can do. It also projects into like, again, the like I'm primarily interested in is the information negotiation, right? Like a disclosure card allows you to share a bit about what you have that might be a fit to a structural need, right? Without giving it all away, pre negotiating, kind of what you're willing, right? Are we going to enter into this enclave together? Right? Is an interesting transaction, sure, yeah, situation, or, like, in a limited integration session, yeah, that makes sense, because we both work for the same company, like the Microsoft example. Well, then there's certain assumptions you can make, but as you're if it's in the open, then those assumptions drop away, and it's more adversarial potentially. Yeah, let me just kind of throw out a few use cases where I sort of imagine so one is, how do I break the limits on like Gmail used to work pretty well. Doesn't work very well anymore. It's like, I now have you know, I can't find things. Your Google Photos. I used to be able to find things. I can't find them anymore, you know. So these sort of aggregated systems are not working that well, right? And, you know? So, so the vision is okay. So do I have to extract all that data, or can I create a new interface to it? Is one of the questions. So, yeah, one of the things that you said up in the room that really got me was, you know, the ability to run this potentially locally, I think, is, you know, I've been thinking about this in terms of local first, AI, where, yeah, 90% of, like, I think you said 90% of people, or 99 point, whatever, percent of people were probably going to use some cloud provider, but if the architecture is such that I have a chance of having equal participation using my infrastructure. I think that creates pressure on the providers, and there is a potential in the same way that Apple kind of took out this privacy. First thing you could imagine a provider saying, I'm going to provide a device sure that you know, is the vehicle by which you have sovereignty, right? But yeah, and Apple is really interesting all this. I'm really interested to see what they're going to be

Unknown 10:09


Unknown 10:21


Unknown 10:27


Unknown 10:32
coming up. Yeah, yeah, yeah. The a lot of the questions that have been raised so far, points that have been raised so far, just kind of get my wheel spinning. Of like, the reason to use agents, in my view, for something and like, why using agent makes more sense than using another software platform, one that existed previously, is to lean into the intelligence of the model so you connect a set of data sources, and maybe those data sources like you to your point of like ID. Address things by ID or address them by value.

Unknown 10:36


Unknown 11:08
You give the model the ability to choose which, which one it's going to do for like you give it the ability to search your Google Drive. You give it the ability to do this, and then it will read in in more detail, the most relevant things to the interaction. It's like, okay, my agents going out to uniqlos agent to buy me some new shirts, because all my shirts are old, and I had to throw them away.

Unknown 11:32
It's going to look for, like, receipt history of shirts that I bought before. It's going to look for what size I bought before, right? It's going to, it's going to go look for relevant information. And so, like, in our situation, they just ask you over and over again. Yeah, exactly. And so I think, thinking about how we connect data sources to each agent, maybe there's like a lightweight kind of signature, or like a design of the interface that we put atop MCP, something like MCP, that's a uniform thing that each agent can like, search or address records by their full content or their full value, read them into the to the context, and then the agents start to have a conversation right about, like, Okay, here's some relevant information I pulled. Here's

Unknown 12:21
what the user is looking to do. Looking to do.

Unknown 12:24
Tell me what, what your best options are, right? So there's like a Data Access Protocol part, and there's an agent to agent part, and there's a there's a tee, there's a security wrapper around that whole exchange. And I think that's kind of like a three level way to think about the technology. I think we're getting into some good use cases. I wanted to make sure that we feel like we've elaborated kind of all of these requirements or ideas correct for it. And then we

Unknown 12:50
can also move into things like constraints. Because one thing that's related to like this type of enclave for me, and kind of what you're saying, Mark about local models, like, let's say you have the most private interaction ever that's ephemeral. It's non training, and, you know, and after it's over, right? Like the TE shuts down, or, like it wipes right, which is cool, but then there's no memory, so it's a constraint. And also, I worry about model versions. So like, how are you updating the TE or the local model based on the upstream model. Like, you want to do version control somehow, right? So that you know you have the most up to date, yeah? Like, foundation model, right? Like, how often do you do that? Like, what's the implication for, like, compute on the device? So I'm going to start collaborating some of these things. I just want to start troubling some of these ideas we they don't think they're definitely going to be paradoxical and like counterintuitive, but then I think we can start elaborating, yes, after this, yeah, just under requirements. I mean, it's sort of an extension of reputation. But, I mean, there is sort of this opportunity with agents to signal somehow that this interaction was really impactful, which is, you know, today we would do it like reviews or start, but there's, you know, that the reality is, like, the agent may not realize in the middle of, like, immediately after that interaction or exchange of information that it was useful, sure, right? You know, like, I recommended you go on this you go into this place in Japan, I'm not going to know for weeks, maybe even months or years, that like you thought, yeah, was it, but I will eventually learn. And there's got to be some mechanism to say that, in the end, right, this little nugget of information or interaction was useful. And I don't know if that's really a reputational signal, but it's sort of a downstream value signal, source feedback, yeah, the t shirt example, like, you know, I buy T shirts that I don't use, you know, like, right? They weren't a good fit, okay, but, like, in a sense, I wonder if we can incentivize, in a mechanism design sense, a more rapid feedback loop, because, right, your agents gonna go buy another t shirt? So you have an incentive to train like your agent. Right feedback to your

Unknown 13:14


Unknown 14:21


Unknown 14:44


Unknown 15:07
agent t shirt start showing up by the name signals like if you return it, you ask me your agent, I didn't like these T shirts. Can you help me return them?

Unknown 15:14
If you go to Japan, the omnipotent me agent knows that you went there and you gave it from advisor, like it sees in the direction of, like, what would be the ideal interface to apps for agents. So I'm thinking out loud here.

Unknown 15:39
You know, one of the things like, I've now got this very, very large Gmail archive, I certainly would love to be able to search it way back. But just in practical terms, Google knows some things that are compact. They like I use Priority Inbox. It knows which things I think are important. It knows which things I think are, you know, this is a promotion, you know, it does. They've been doing this kind of stuff for years, but there's no way for them to tell my agent the signals that it uses to make that determination, you know. And that would be a really useful thing to say, okay, an app that uses AI internally shares the compact representation it has made of user preferences, you know, like, similarly, you think, okay, who have I contacted recently? You know, that's probably something that Gmail knows. But like, so in some sense, I'm almost thinking about, like, how would we specify,

Unknown 16:50
you know, in an intelligent way, you know, you think about how, you know, we've all given up on making bookmarks, right, you know. But you know, there were things like delicious for a while. But, you know, those things are worth revisiting

Unknown 17:04
in the age of AI, you know, where you go? Oh, yeah, you know, like, how would it make it really easy to remember certain things out of my you know, Chrome history, you know. So there's these. We have these wells of personal data, you know, the files we've created, the, you know, but we have these, these exhaust trails also. And I think the application providers know something about them. They're increasingly building AI features that are going to be built on them. But there's no standard for how those things get exported. I can go, yeah, give me all of my 20,000 contacts, but I can't give, you know, give me your idea of who are the ones who I have contacted recently, right? That's the Yeah,

Unknown 17:48
in the past year, you can dump a bunch of E cards, but, you know, I just hooked up my AI to Apple, mail, empty CP, so try to do what you're doing. It's okay, but it doesn't embed. Like, what's important, right? And so the question is, is there a standard that we could start to imagine for you? You go, Okay, so the portability is not just the data. It's the Yeah, it's the intelligence that you have, it's the interface that you give to the model.

Unknown 18:17
Yeah, I think, I think one pattern that's been emerging as really helpful in MCP that models are getting very good at, is this idea of progressive discovery. So you have, if you have like, 10 MCP servers, and each of them have 100 tools, you've got 1000 tools, right? So you can't just dump all that information into the context and have the model make good decisions. It'll make terrible decisions. But what you let it do is you give it a compact representation of the servers and the tools, like just the names of the tools, and you let it search. And then when it finds a tool, a server, tool name that it thinks is relevant, then you can have it read the full definition of how to call the tool, and then it will do that, and it'll find maybe four or five of the best ones. And so I think you can layer that on to other kinds of data as well, right? So if you had Gmail, you could have, like, messages, you could have contacts, you could have, you know, email threads. You could have each of the data types, and then you could give it like a standard interface to discover more information about them by the intelligence of the model. So the model would like say, Okay, let's search contacts. Now I found these two or three hits. Let's read the full details of those two or three contacts. Yeah, I found these messages based search, based on searching, subject, title of email or something. Now let's read the full content of those five messages, and you let the you let the model use its intelligence to progressively discover the right information. So the MCP that Apple Mail, it's a third party one, but it does that. But I'm starting to think that what it needs to expose is things like, Who do I respond to most quickly? Right emails me the most. You know, those are the interesting things that can really go, Yeah, I'm really thinking of some work that Mark Smith did at Microsoft Research years ago on Usenet. He was able, have you ever seen this stuff? I just remember to use that. Sorry, but he basically, he basically had would do these visualizations of Usenet threads. He'd say that person answers questions, that person flames, you know, and he could just tell from the shape of the threads.

Unknown 20:24
And, you know, you can't go that's a classic thing for AI, like, Who do I engage in substantive conversations with? Do I have frequent conversation? You know, there's a lot of, there's a lot of signal in there that I think an AI could extract. And I guess the question I'm asking myself is, could we encourage providers to have do enough of the work on behalf of the user and then provide that compact representation? Yeah, you know, so that it's right, yeah, because I can go and have my model make the calls and build that information locally, but that's really inefficient. Yes, exactly. Yeah. I mean, there's maybe, like, traditional ml classifiers and things like that that could do a good job of those tasks as well. Yeah. And then you have, like, a more kind of curated data set for the model to interact with, yeah, but I think that, like, concretely at the email example, like the use cases, like, I have my own Jarvis. It needs to talk to Gmail. I need Gmail to tell Jarvis that if lucky doesn't respond to this email, this deal is dead, right, right? He's taken too long to send over the deliverable or the proposal. He's got to move right, and he got to help him. And that's not an ML. It goes a little bit beyond ml, because that's actually like, I'm assuming Gmail has some intelligence. It's evaluating my emails and has, does that make sense? Yeah, but it's kind of this idea that you want the apps to be having a conversation with your app. So my goals, sorry, my goals are shared between both, right, like, right? Yeah. There's different use case I think, yeah, is our purpose here to try and come up with something as concrete as possible? Yeah, so maybe we should focus on this email use case cluster, because it seems like we could maybe make some progress there. And email contains all your receipts and everything, right?

Unknown 20:53


Unknown 22:14
It's pretty rich.

Unknown 22:17
It has your social network, you know, an applied social network, but not Gmail like it needs to be, whether it's local on my machine or Gmail, or freaking Hotmail, or whatever it should be. You know, if I, if I were to insert my privacy piece here, all I would say is that we can move also from just like messaging in general, because, well, Gmail has, it's a message level, but,

Unknown 22:44
but, you know, I think the point is, like, there's, there's things around authentication, there's things about roof conversations, yeah, permissions, around sharing content that might be sensitive, and then so I think it'll fit, but, yeah, messaging may be tractable in a different way, you know. It's also got a social network. It's got contacts, yeah, and, you know, and unlike you know, Gmail, which does not really have a decent group form idea, it also strikes me that, like any solution that's successful for this may not be able to be too prescriptive about how it does the data access the context gathering? Because you're going to have agents all over the world set up by different people, different organizations that are going to adopt different kinds of tools for accessing data, skills, MCP, command line tools, all kinds of things. Like, if you try to be really prescriptive about like, how a me agent needs to gather the context, I don't think you're going to win that conversation. Think of the minimum viable products, like, what is the absolute constituent? Well, I guess what I was going to suggest is like, maybe we should just focus on the interaction between two agents and the Secure Enclave part, and then each agent can bring its own way of gathering context about either the organization it's supposed to be part of or the person, because that offers people a lot of flexibility that I think if you don't have that flexibility, I think you might not get too much adoption if everybody has to do something in a specific way, right? Like my personal way of using agents is I connect them to MCP servers that have access to my data, and an agent that I run like that, if it were talking to another agent, it could bring a lot of relevant information about me, just based on like my way that I've set up my agents currently. And so I think we you don't want to leave that value on the table, right with if people have different ways of having their agent gather context about their company or themselves. Can I ask you, you made a comment before when you were talking, I was like, You're speaking in a diagram. Like, I just wanted to like diagram what you're saying. Would you be able to diagram architecture for what you're talking about? I think we could use that as a starting Okay, yeah. Alex, yeah.

Unknown 24:59
So can I throw out one other thing before we do that?

Unknown 25:04
And this is really the notion, you know, continuing this notion of abstraction, you know, in a certain way, I'm realizing in the course of this conversation, what I want is for my agent to be able to make inference, the coalesce into abstraction. So, and this could be really related to any communications medium. You go, Okay, you frequently communicate with these people as a group. I am going to make it a group for you, as opposed to, I go, I have to remember to add, you know, like my do this family thing. You inevitably leave someone off, yeah, you know. And you go, this is silly, you know? And you have a name group, and then you can't see. They don't let you see who's in it. I have text messages in my iMessage where I have one that's with my parents, yeah, and I have one that's with my parents and my brother, right? And sometimes I send different messages that I send just to my parents versus the one I sent, right? Yeah. And so there's something here about what's the interface for specifying, you know, who I'm sharing with, you know, is sort of like, in some sense, defining the boundary of me, you know, like we're going to set up a group. We go, we had this shared experience, and so we're going to share a set of things with this group, but there'll be some. So there's something about, how could AI help with that problem?

Unknown 26:21


Unknown 26:27
You know, is part of this to me, you know, agent, not me. It's understanding the boundaries of my inner my interfaces with the rest of the world, whatever those are, whether it's my devices or my my people, and I think there are even more basic problems to solve, which is just like, what in these interactions? Like, what are the communication rails? Yeah, right. Like, what, what protocol are the two agents going to use to speak to each other? There are multiple options in industry, right? Yeah, yeah. And I think to kind of like, encourage progress forward. You can you can pick one and build a demo on top of it and show it to people and show the efficacy, and then that maybe helps drive adoption of those standards, if people can see the value right. Because I think ultimately what we care about is impact, and having our agent be able to go do something useful for us that takes away something that we would have had to do ourselves, that would have taken time and energy and focus, that if we could have it taken care of for us, that's, that's the value we're getting out of it, right? So I think we can focus on, like, the really basic part of like, how should the agents talk to each other, right? What's the, what's the energy format?

Unknown 27:38
Do you want me to draw? Also kind, yeah,

Unknown 27:42
please. Alright, so, like, so I guess this is a paper say this is, like, my this is Alex's

Unknown 27:51
agent, and let's use the case of like, I'm buying clothes, right? So I want to buy some shirts from Uniqlo, or I tell it to go my agent to go talk to unit close agent to buy me some new shirts, because all my shirts are done.

Unknown 28:05
The way I would think about connecting data sources is like I would do it via MCP. So maybe I would have a Google like a Google Drive or a Gmail combined MCP server that would have an interface where the model could search my Google Drive and my Gmail history.

Unknown 28:28
Maybe I would have one for

Unknown 28:33
like files, like a file system MCP, where it could read local stuff that's on my desktop. It could search my Documents folder, I could search my download history, etc. Like, I would do those over MCP, and then I imagine, you know, Uniqlo on their side. Let's just make up an example. They'd have, like, an inventory server. Like, one thing that's bothering me about this is you had to go to Uniqlo and buy, like, what if you're just like, oh, you know, don't have anything to wear. This smart shirt, I guess I'm now, yeah, it could, like, ask another team, is it could discovery, discovery of like, which one is going to be talked to is another problem. But I guess I was just trying to model one which is, like, once it's been decided.

Unknown 29:17
I mean, it's kind of hiding a little bit the group aspect and the network and the collaboration, which I like, which is, like, it could ask your wife's agents, like, or your friend somebody that, like, where do you get your shirts? Okay, Alex likes those shirts. My wife buys all of my best shirts. But, yeah, sure, we can run this. I guess I'm just trying to model

Unknown 29:40
something that can make us an example and let us think about the protocols or the tech that would support it, right? Because you could imagine the same technologies being applied in a group where there were three or four, like they might work the same way, but, but let's say, yeah, so, like, inventory is one that they would have down the line, right? Like they might have some sort of, like logistics one, that could figure out what the shipping options are, etc, like, so it could make a comprehensive plan.

Unknown 30:11
They'd also have your buying history, likely, if you're, like, a customer customer history one, right? And then I think this needs to be figured out. So, like, once these agents access data from whatever data sources they're accessing it from files or MCP servers or whatever, how the two agents actually exchange messages and say, my agent would say, okay, he needs to buy some shirts. And here's some here's some relevant context. Here's like, some receipts that I found from when he bought shirts before. Here's some information about budget. Here's some about whatever. Those messages need to be sent across some kind of protocol, right? So I guess that's this is a question mark that we could talk about options for. The other thing that stands out to me about this interaction is like, there's the Enclave part the Trusted Execution Environment. When this exchange occurs, what is the runtime and how is that secured, so that you can be confident that your information is not leaking elsewhere during this exchange, and that at the end you can delete it. All right, that's the deleted to approvable, yeah, or, like, partial display. You know, a lot of people will rate the products they buy on Amazon, and that have us a mechanism for that environment as well. Yeah, it's trusted environment between the agent and the store bought, or is it around the agent in the store bought because, like, the agent could send way too much information to the store

Unknown 31:48
well, and it's a problem too. I mean, this, they're very hard parts of this, right? Like, how do you also make sure that during the Trusted Execution, that this one doesn't all of a sudden they send them? Right?

Unknown 32:00
Yeah, I was sort of thinking about that. My comment, sorry, just a response is like, right now, status quo is you don't have your own agent, and you rely on unique low to remember you, to remember what you bought before, how much you paid for it, to remember where you're located, etc, etc. So like, how do you move from the status quo to this paradigm, which is Uniqlo doesn't know anything about you, and you keep all the information about your interaction with UNIQLO. I feel like the migration path is really quite changed.

Unknown 32:31
Probably doesn't want to do that

Unknown 32:33
exactly. There needs to be a aggregation of information from the world at large. Like I go to Uniqlo, I look at how people think about the T shirts, right? Like, if this is how everybody buys T shirts, Uniqlo has their hand forced, yeah, but, like, it needs to somehow share with me, and I don't know where the incentive is, t shirts. Do that be more expensive? How other people reacted to those T shirts? Well, I think one of the questions is, I guess I we're all sitting here with our private data, and we're also in a world with shared data. I don't know that. I consider it a requirement of the system that Uniqlo does not get to keep its knowledge with me. That just

Unknown 33:14
seems like that's that's like a counter intuitive recommendation that will actually not extra exactly. I don't want them rummaging through everything. I do you want you want to keep private. What is private and you want to keep and how do you distinguish here? Yeah, but there's also you want them when they you know, like, I think about how much you know, Amazon literally tells me you should buy this size. But you know, because, based on, yeah, they have, they have accumulated that knowledge, but they keep it as a private asset. And I guess the question is, are we talking about some kind of portability standard where they have to they give that to my agent? So what are the incentives that would be required to get them to give that to my agent so that I go somewhere else? And it says, yeah, there might be like people who bought this product also bought some memory of the amount of data. Action to do that Amazon knows that you buy a shirt size of a certain size, but your but your agent knows your height, weight, fitness, and you want to make sure that your agent doesn't tell Amazon your height, weight, fitness, and just gives it the size. Like, that's an example.

Unknown 34:27
That's fair. But I mean, Amazon has inferred some things about me based is sort of like, based on the information I have about you, and based on the information I have about millions of other people, this is your size, right? Yeah, because, because size is a really interesting proxy for something like this, because it's actually the intersection of the private data and the aggregate data that tells you that actually you normally wear a 10 and a half. But in this shooting you should take in the library,

Unknown 34:56
lot of it inferences on your return history. That's right, right? That's right, right. As soon as you start returning, they get a lot more and they have value there. And the question is, what are the incentives for them to return that value to me in a compact form that I can reuse? Maybe there isn't an incentive, but that would be a question. Do it right? If we do it right, I think that this architecture can bring the possibility of users taking back control of more of their information and still having the buyer get some value, because if more of the data access, if my agent is truly acting by interest, right? And you can think about setting that up in different ways of like, what is the system prompt of this agent, so that if Uniqlo asks me, like, improper questions, right? If the merchant asks my agent, then the agents is going to be like, No, I'm not telling you that. You don't need to know that to let them buy T shirts. You can control more of it, right? And then the value that they still get is they might get a sale at a price, right, like, so that the companies would be incentivized to try to ask for the information that's most relevant to make the sale, right, right? Whereas more of the data control, like, stays over here. Isn't that a disclosure artifact? That's part of the communication back and forth, which is like, I'm able to share with you information that supports this goal, yeah, if you go, you know. So, for instance, I mean to be honest, like, I do think it's appropriate. I mean, I used to work with Nike for a long time, like that. You will sometimes need to know what their weight and height is, because, like, you don't want to sell the wrong thing, right? But on the other hand, if you said, like, well, how much does Alex make? Yeah, it's like, Wiley, well, but also it's also, what's the use case, I know your weight, and I can use that to help you fit your clothes, right, but I can't use it to basically pedal it to a weight loss, weight loss drug companies right to targeted advertising. What's happening right now is they're doing the ladder, yeah, but you could, for example, if you're if you're a retailer, wouldn't it be interesting to know everybody's height, weight, like metrics, you could do a whole resizing. I mean, what kind of small medium, large is like very happy way,

Unknown 37:11
True Fit. There you go, as it is a data artifact, right? Me, buys all bought into is a way to say lucky. Typically buys a medium from J Crew, and it, typically, you know, wishes you could buy small for me, I'm joking, but, you know, you get the idea that, like, you know, right, that that is an artifact that, again, at a disclosure artifact level, like, would allow you to, but, but can I just push on one thing? Yeah, I think it's I'm struggling with the most you have this MCP connector concept to Gmail. I mean, I think if we refer to just like change this narrow just a little bit lucky, sent his clothes to the wrong cleaner at a hotel, they've eviscerated everything he needs to buy new shirts, right? But that's different than re buying, being in close stuff, right? And I think it is sort of raises a question.

Unknown 38:07
Is sort of raising a little bit of like, okay, I need intelligence out of my email for what types of shirts did I buy in the past? It's kind of in terms of my user goals and opportunity to, like, mix up my wardrobe a little bit. So I need intelligence from the sellers and other Does that make sense? And the thing that's challenging me on the MCP, thing is I don't know how much intelligence you're going to get out of the MCP, versus an agent to agent conversation with the I guess data source itself. I guess I'm coming to this from personal experience of having adopted this architecture for how I do my work really aggressively. Like, I have a set of MCP servers that I connect to my like, I use scoop straight because I work on, I have a set of MCP servers that I connect to it. And basically, whenever I need to do anything, those are already set up. And then I just tell agent to go start work on an idea, like, I'll give it the idea. Like, I would tell you in a sentence or two, I tell it to the agent, the agent immediately starts reading all kinds of information from my Google Drive, from the code that I've written before, from PRs, that I've put up on GitHub, from things that have been done before, and like, it gets to an amazingly informed place just by reading those, those things, like looking at the tool space that it has, calling the right tools, reading the resource, I totally got back. I totally get it. I think, what I think what I'm really just trying to stress test a little bit for my own understanding, just to be clear, because I'm not an engineer, is don't, isn't that just also, like, really inefficient, like you're asking our agent to, like, really rummage through some of these data sources. Don't we take these data

Unknown 39:49
it's inefficient if you, if you design the data sources that you connect it to to just return everything, but if you give the model the ability to do progressive discovery, where it can search for things, right? And then it sees, like, a couple hits in your email subject lines that match a certain token. Okay, now I'm going to read those three emails that I found that match that it's usually going back to the shirt example. I'm sorry to linger on this, because I really like at the shirts example. Like, if you like, I'll give a very concrete thing. I like Japanese denim. I just do, it's just like, it's my prefer. I don't want to, you know, if I'm gonna spend money on denim, it's the thing I will go to. Like, this is assuming that the agent in its progressive discovery is going to happen on that insight. I'm also just kind of trying to stress this my owner saying, don't we think that Gmail, or an agent built around Gmail, should, at a certain level, be like surfacing these insights? And isn't the conversation around having that like my personal agent talk to the Gmail agent and say, I'm trying to understand this task groups, there could be another agent in this T, right? It could be a Google one that has access, obviously, to a much richer set of data connections inside ecosystem that could also be in the T

Unknown 41:04


Unknown 41:11
and when both of them need to know something. And the other one,

Unknown 41:15
I was getting to it from a slightly different angle, which I think is maybe what you're looking for, which is, I'm looking at the list of tools that this mail MCP exposes, and it's, you know, okay, list accounts, list mailboxes, list emails, get email and search, right? Yay, you know, like, that's pretty you know, like, search is the most powerful narrative. It's still a pretty coarse tool. What other tools could we suggest to Gmail or other email providers that would surface more granular. That's exactly right. That's, that's what I think. What categories have you come up with? Or what are the relationships? If

Unknown 41:49
you have groups, though, and you get flexibility for how the agents bring data to the conversation, like via their own MCPS, or their own skills or whatever, then you can get, you get really rich things out of each agent, right? Because if, like, you said, yes, it's okay if Google's agent, like, joins my group with whatever, and then that may be connected to 15 MCP servers that have an incredibly well thought through set of tools for the model to go, right? Well, but you need those Well, I think in a certain way, what we're kind of specify, starting to sort of lay out as a framework, is what I'm hearing, is identifying for a bunch of common sources that would matter to a user that they're already using, whether it's email or messaging or their files or whatever.

Unknown 42:40
Are there the MCP servers are equivalent that have the right tools to do the things that that user wants? So what, in some sense, what we're looking at is, let's go. If we were thinking of this as a project, we'd be saying, Let's go evaluate the tool lists for these various connectors, and ask ourselves, are they adequate, right? Are they separate? Are they sufficient? Do they allow user autonomy in the right way?

Unknown 43:09
Just to be specific, I'm saying search is a tool, but analysis, right? Right? Is the tool that feels missing, right? Right? That's I'm saying we want to identify the missing tools. Go, you know, like I go with, with search, you go, well, that's just like, probably with a really large data set, is one that exists already. See the ideas point of, you know, software that's going to survive as the software that saves tokens. And I think this whole idea that, you know, in some sense, that's the whole game right now. Is like, what does an app need to provide to me to have a token, efficient conversation with my agent on that point for any particular kind of thing I might want to do? And do you think it's connected to your point? Alex, just to be clear, of like, progressive discovery, Oh, yeah. But because if you provided, if you asked like Gmail, hey, I'm trying to get a sense of Lucky style right now. And his preferences when we're talking to hawk Berry is like a Bougie example that's above Uniqlo, right? It's sort of like anyway,

Unknown 44:16
sorry to go into the weeds, but you know, like an analysis tool would be able to say, like, hey, I want you to analyze on the resource data you've got. Like, I said, I want some insights, yeah, on what is, sort of like, preferences and tastes, and also, like, you know, and then, you know, there's some interesting dilemma there, of, like, okay, should you what is coming out of that analysis. What can you ask for analysis? I'm kind

Unknown 44:46
of moving away from agent to agent. That just seems wrong. Like I'm thinking, if you just ask an agent, like a set of bills, like, what does he like? What did like, just, he's gonna all be just, yeah, like, just multiple like, like, a form raise the thought that kind of makes more sense for buying, because first of all, the user can see it before the agent, like fills anything out. I can see what's asking for. But also, why does there need to be a seller agent? Why can't it just surface, like the information to the other agent? Because you may not have access to the data sources. Yeah, I think this is like the idea, as I understand it, is like my agent has access to data sources that I've configured and given it right?

Unknown 45:32
Huck Berry's agent has access to data sources that they've set up that their agent should be able to access. And the interaction that's happening here is both of those agents are kind of like going into a room and exchanging information so that something useful can get done for both parties, for the seller, it's that they make a sale for the user. It's that they like get a personalized thing or what, and some information that they're looking for, and then the then they, like, split apart, and the history of the interaction goes away so that it's more secure. It's like, if I had direct access go away. What was that? Will the history go away? Would support that on

Unknown 46:10
like, a protocol level? No,

Unknown 46:12
but you could put certain architectural constraints in place so that it does so like, you can put them in a sandbox where both of them don't have access to a file system that will be persistent, that they only have certain forms of network, Internet access when they're in this environment. Effectively, we're like a third party at a station.

Unknown 46:30
So the question of, like, why do you need another agent? It's, I think it's so that each person can decide, like, what kind of information about them their agents going to have, as opposed to just giving up the like, privileged access to all your data, like, I'd be much more comfortable putting an agent that I know is acting on my behalf so into an interaction like this. So maybe we separate, like, there's the buying part, which doesn't need an agent, and then there's the interrogation of the product or of the store which does need an agent. I mean, I'm not sure how useful that separation is. Always a drawing one we could just occur, but, yeah, I don't know the buying part might like if we're going to negotiate a price is also a I think the question is, is this a dynamic conversation, or is it a one shot? Is that we want like agents to go represent our interest, right? Which is like, so the thing I'm sending to the conversation is, like an agent who's supposed to act on behalf of Metro agents again, yeah. The question is, do you need an agent on the other end represent well, they probably want something to act in their interest. Yeah. Can I propose something that maybe takes a slightly different direction? I worry that the shopping example is a degenerate case that doesn't actually expose a lot of the interesting use cases. Because, first off, even for shopping, you know, I would propose that most shopping is not I want x, or it's like, I want, I want something in the class of x, but it's, it's, I don't know enough to know exactly what I want, you know, it's not like, I want this particular shirt, you know, it's, I think that makes it a very interesting use case, because the agent can help, like, right? Know, my unknown, no, I know. So that's saying, you know. So, like, like, yeah, we're really interested in a machine that helps us with the with known unknowns, you know?

Unknown 48:28
Yeah, you know. So I just want to make sure we don't keep exploring these cases. Then, yeah, we kind of went in depth on this shopping example. We can come back and, like, go deeper into this example we had up here too. Yeah, we can also generate some more use cases. I mean, I'll give you the one that you know that is always on my mind, like I try to organize a meeting like this or the food camp, right? I'm very Who should I invite?

Unknown 48:57
And, you know, it's sort of like, it starts with a seed, you know, and, you know, we find somebody, and then we go, Well, who else is like that? It starts in the first circle is, who do I know, who's like that?

Unknown 49:13
And then there's some, some value judgments, you know, like, oh, that person's kind of disruptive. No, yeah, you know.

Unknown 49:21
Or,

Unknown 49:24
yeah, that person was great there, you know, last time we had them, everybody loved them. So there's some some personal knowledge that comes in there. And then the next one out is, well, who do I not know? And it's sort of a search, which often goes, you know, and if you think about how we organize this group, we talked to somebody, and they said you should also invite so and so, right, and so, this sort of like a multi hop process of discovery. And you know, like if this were happening in an agentic frame, I would want to be able to again, maybe, you know, maybe this is not actually something we should be thinking. It is a fundamentally human process. But maybe there is something you know, like, where you know, like, I would love to you know, like, like, how would would, you know, a rapid fire conversation with another person about what, what should I know that you know that you that I don't know that

Unknown 50:33
those ones are sort of, you know, less important to me than, like, Okay, I mentioned, like, the conversations that I, you know, that Elon, I had with people were all around this, here's what we're thinking about. And the first signal is, you know, people go, you know, like, just as a good example, I talked to Daron about this, and I think he was just not interested in continuing the conversation. So off the list, right? Even though, in theory, I thought, Oh, he should be interested, right? And, yeah, this is cool. And so the question, really, you know, whereas, you know, I don't know how Elon found you, and we, you know, we have a conversation with you, and then that branched out from there. So you're kind of, in some sense, building a tree, you know, where some, you know, branches die out and other ones grow. And I guess I'm just trying to think about that as you know, because agents can do a lot more of that than we can know, all the different things, right? Could they, could they explore and then start? How would they start to evaluate, okay, based on some kind of weights, you know, you know, like, if they really understood what I'm doing. And I think about this even, like when I'm writing, and I, you know, I often, will I do a brainstorm with Claude, and I'll start talking about my topic, and then the response from Claude is bringing in stuff that I did not know, you know, it's like, yeah, like, I didn't know that Montesquieu wrote about that same thing, right?

Unknown 51:03


Unknown 51:33


Unknown 52:09
It's maybe, like, I don't know conceptually how we're thinking about the me agent, but this year, your approach to this is getting me thinking about different ideas, like the last day that we're here. So tomorrow I fly out at 4pm so my plan is to try to go to Milan and spend a few hours in Milan. I've never been to Milan before. I'm sure I have many friends, right, close, people who have in the past, have something useful to say

Unknown 52:36
out there to find him. Who else agent is willing to like, join a conversation with my agent network recommendation, even with person to person. Okay, there you go. There's my list.

Unknown 52:43


Unknown 52:52
Now, I mean, that's so I feel like this is the agent version where, like you're exactly, it's only a few places. But do you remember lanyard, Tim, you probably remember, yeah, oh yeah. I mean, that was the same sort of thing, but yeah. Anyways, generation, if they're actually worthwhile, this is my mother in law, so I'd love to make a distinction here, like, what you were saying. And I think there's a lot of this that I was trying to bring into the conversation about T shirts, which is, like, I should go out into my network and ask for like I have never heard of, very sorry.

Unknown 53:09


Unknown 53:25
Now I'm curious, and I might want to know that that's a lot like network discovery. But I think something that's unique about this use case that's not in the product. Use Case is collective. Is more than the sum of the you're building a group. You're not just stubborn, you're building a group that's going to have better connections than any pairwise bilateral relationship. A really common problem in events is figuring out where to host them for big events, right? So like this just happened yesterday. We were all supposed to be going to Lusaka tomorrow or next week, and the government canceled it, like, I mean, because they didn't like the programming, which is, you know, kind of a badge honor, but there were, like, 1000s of people who had booked tickets to go to Lusaka. And this is just, I mean, I'm just telling you a little news story, but I think one thing that this community really struggles with is, like, you have activists who work on censorship in Iran. You have activists who work on spyware in China. You have activists like, where can you go? You can't host them in the United States right now because visas are in travel and borders are really challenging. Even Europe is really difficult, because, like, Shane and visas for people in Africa and Asia are, like, out of reach.

Unknown 54:18


Unknown 54:45
Where do you host this meeting? Need a cruise ship? Yeah, well, that, but you, but what I was, the reason I think this feeds into what you're saying, Tim, is, like, there's also the interesting aspect of this, where you can look at the group. It's like the group intelligence becomes possible, not just me agent, but a we agent. And something that people had put upstairs is like a way to broaden this a little bit and think about privacy implications, but you can make decisions on an aggregate scale about certain things, yeah, yeah, yeah. I think, I think maybe the same kind of technical architecture that's coming into focus a little bit can apply in both situations, like, if you have a way for agents to talk to each other, and those agents are connected to a model and they're connected to data sources, then these kinds of exchanges of all, of all flavor will start to occur, right? And the, you know, the actual job is to itemize. I think the near term job is to itemize the missing tools in the MCPS that you have to connect to all those data sources so we allow the functions that we want, and the protocol between the agents, yeah, yes, that's one that's, there's not a lot of alignment on the admin industry, like

Unknown 56:00
you said, aggregate group preferences. It's there's a piece of aggregating group value. Like, both are relevant. We're not just the sum of our parts, like synergy and value. Yeah, synergy. It's also the interesting of ephemerality. You know, there's, like, where are we going to hold this next meeting? Is a preference that does not need to be saved beyond the immediate purpose, where, whereas, you know, we strongly value diversity is a persistent value. And so there's a sort of interesting question about, you know, persistence versus Evanescence in these systems. And, you know, I find it all the time. You know, like trying to get Claude to remember something that really matters to you is hard, right? You know, because it doesn't have the sense of strongly held versus weakly held.

Unknown 56:53
Yeah, in the way that you start using lots of adjectives and stuff to try and steer it and yeah, time check.

Unknown 57:05
So what are you supposed to report?

Unknown 57:09
So we've got three pretty good use cases. We

Unknown 57:12
have requirements and a constraints. Do we want to visit that with use cases in mind? I've been trying. I think we were pretty good the first time around. Why don't you all? Should we do one more use case before we do that?

Unknown 57:26
Sure? I'm not sure what it is.

Unknown 57:30
Hopefully my my iPhone can read my handwriting at this point, so I will take a picture and try next. Sir, you do travel planning. Travel planning is logistics.

Unknown 57:43
Oh, for event planning. Oh, besides ourselves, like, where to eat in a city you're you're in for the first time, but there's like, an n squared problem, if you're reaching out to every agent in the city, like it's gonna be expensive, I feel like a common use case we commonly throw around that's not up here yet is the B to B kind of use cases. Like, you know, I need to sign an NDA to talk to LinkedIn about this or that, or I need a new solution for invoicing or whatever, yeah, and I don't or, like, I guess you were saying the research, the researching, somebody, yeah, invest in I mean, the like, I mean, you see this a lot right now. Like, there's this entire cottage industry of, like, analysts who just sell their reports at like, highest markup to banks and funds and so, like, I just came across one of these last week. I mean, like, your fund, you're trying to figure out if you're going to take this position, like we talked about yesterday. About yesterday or the day before, and then this other group says, I have gone to the data this is like happening a lot. I've gone to the data center. I've seen the order list, and I've aggregated together across enough of these new build outs, the purchase list, I can tell you who's winning the most share at the networking or the power level and so on, and so, like, that's extremely valuable data, extremely valuable. And so the challenge is just sort of, like, they don't want to give it away.

Unknown 58:07


Unknown 59:12
You really want the information, but you don't exactly want to reveal your position. Sure. How do you negotiate that? Yeah, I think that's an interesting use case. Yeah, yeah. It's like, and you would, you would kind of hope for the agent in this scenario. The point, as I'm getting it, is that you would hope for the agent to use its intelligence to reveal information strategically, yes, in these interactions. And so this, this is where, like, you're putting something forward to act for you. And the reason why that's better to do than it was with software previously is because the model has intelligence. It can bring about what information it sends in exchange. And I think, like, I sort of was struck by your conversation with Jacques last night, and you brought up Alvin Roth and who I didn't really know, that also stayed up. That's why I overslept, partly, right? Like, I stayed up, kind of like just researching and reading Roth's papers and then asking more questions in Claude. So like, for this scenario in particular. So what I got to at least, was the idea that the agent could provide disclosure cards back and forth until they go into the enclave and then they exchange the information, right? So, like, one form of disclosure would be, I'm really interested in network switch providers, but I won't say who. Okay, do you have any coverage on network switch providers? I do. Do you have any coverage on the following five? I do, did you? Do you have any data that's primary? Yeah, I do is your primary data, right? The cynicism exchange that happens after the stuff that's communicated in the parts seems interesting enough to both parties, progressive discovery, right? And, yeah, progressive discovery is kind of the negotiation in part, because as you start digging in and you start saying, do you have, do you have order data? Yeah, right. I do have order data. Do you have order data for the following companies? I do have order data. Is it verified? Yeah, it is. Did you get it from email? Or do you have the paper invoice? I do, like, this is one guy in the industry, Dylan Patel for semiconductors. It's like, all this firm does semi analysis, yeah, semi analysis, like, for so much of their like, you know, demand signals, they're like, somehow sourcing these order lists for these data centers. And then it's, you know, Dylan writes, but he also has this huge data business. Now, it's crazy. That's crazy. It's like six people, and that's all I do is like, negotiate this access for for investors and funds and whatnot. So, but I think this idea of progressive disclosure cards is a mechanism. Yeah,

Unknown 1:01:53
one other thing that came up when you're asking about the travel thing, yeah, so it fits in the in the beta and alpha framing that we kind of explored.

Unknown 1:02:01
You know, there are aggregators, you know, TripAdvisor, booking.com, Google, whatever. Who will get, you know, or US Yelp, you know, whatever. You know, you can go check and they will give you their lists.

Unknown 1:02:16
That's beta, you know, because it's so this is the common thing, you know. But I'm thinking, when I went to Japan, I'm going to kanozawa, you know, I reached out to clerk Craig Mott, who's, you know, walk all over Japan, is a foodie. And, you know, that's alpha, right? He does. You got to go this place and this place and this place. Well, you know, Chef. And you ask them, Where do you go, right? Yeah, exactly. So the interesting question is, there's an interesting boundary between this idea of the aggregators still have value. You definitely want to check those things, but you also want to ask, Who do I know? Who has Alpha? I asked Philip star sushi chef in New York, where to go into Tokyo before I was visiting.

Unknown 1:03:02
Yeah. Listening family more, yeah, yeah.

Unknown 1:03:12
It's worth thinking about in this whole thing of, how do agents find alpha is kind of Yes, yeah. And I think that's kind of what I meant again, about this missing skill in the MCP landscape of like analysis or insight, that it's not necessarily about, like search, but it's like a little bit fuzzier. So like, if so I think, like, going back to your Alex, your example about Milan. Like, could you ask Gmail?

Unknown 1:03:38
Hey, I'm in Milan.

Unknown 1:03:41
Can you give me suggestions on friends that you think I should ask about? Because, you know, I'm here and it's not, does that make sense? And then it reaches out to their interesting opens up an interesting question on the Enclave, you know, like, Okay, I'm not asking you to reveal a certain kind of private data from that person, but I am asking you to reveal that they've been to Milan, yes, and maybe for somebody that would actually be private data. And how do we know that? Yeah, so it's a slippery slope, yeah, but maybe it's also something that you want to broadcast. It's not, I mean, we're assuming, like, all personal information is always private, yeah, to the travel example, like, I have a map, I mean, you know, backpacked up and down Japan as well, and I have a map in G maps that, like, is widely shared amongst a circle of friends, yeah, right. And it's been a benefit, because, like, people don't, you know, people find the map and also, like, I don't have to keep there's emailing it, there's leaving it open on purpose. Yeah, flows, that can be

Unknown 1:03:53


Unknown 1:04:49
helpful with things like this too, right? Like, if my agent was always, like, available to go connect with any of my social networks agents, and I got a little thing saying, like, hey, so and so wants to talk to your agent about, like, whether you have any recommendations for India, like, from the travel that you did in India, that I have records on, that you said yes or no, I could say no, yeah, no, that's fair. And also, I realized this also signal on, this is already public, you know, this kind of I'm thinking about the friend da kind of thing. You go, okay, is this is you're making the determination, is this private, or is this public based on, you know, signals like, oh, this person has written about this. They've talked about it. Of course, it's public. Yeah, right. So I don't, I don't need to ask, because, you know, but the maps example is, it's a shareable link that's always open, but I don't think the link is indexed anywhere. Yeah, right. You know, it's on. It's actually very much a friend da thing. If you're in our friend circle, you sort of know. But in Alice case, the agent wouldn't have to ask you if it's cool to share that. Yeah, exactly. But like, I mean, there's

Unknown 1:05:57
a reason you don't post it on the internet publicly, right? It's dexable, right? So it's some intelligence understand how far why they shouldn't be sharing.

Unknown 1:06:06
I do really believe, though, that all these, like, more detailed cases can be addressed further down the line. Like, the way that I like to approach technology development is you make a really basic thing possible first, and you have it out there as soon as you can right? Then you can layer on. So like, when the agents are having a conversation, maybe later, you can do a thing where it's like, in order to give that information, I need my human to click the button on their phone to approve, and then that te will, like pause until the human, the human being, requested, but, but those are things you could add later, right? Like, you don't have to solve everything, so you're arguing kind of for use. Case number one, any basic, any basic interaction where it's like, you'd have sort of an approved set of use cases, or a few set of data sources. You'd send your agent into this environment and it could exchange freely based on those data sources with the other one. I think one problem is that we're trying to set up a two sided market, and so there's some speaking about, there's always this problem of, like, how do you get enough congestion? How do you get enough people on both sides of the market to be present, to make it worth my time? So, like, your unit globe, example, he's an agent for this to take off. Yeah, yeah. Sure.

Unknown 1:07:14
People that are interested in the idea, yeah.

Unknown 1:07:18
Seems like a very good yeah. All of us could get one. Yeah. So should we now do? Sorry, you were starting to something, and I said I felt like we had pressed forward, yeah, so you want to do that sort of wrap up, kind of thing you were thinking of? Oh, no, I didn't. I wasn't trying to tell us to wrap up. I was just telling us we have 30 minutes.

Unknown 1:07:42
But I think far, no after, after lunch. And just for what it's worth, I've been recording this, and I will feed it to Claude. This will make a very nice summary. I hope.

Unknown 1:07:56
My instinct was to go take a picture of every page we've done so far and send it to goose and tell it to build a prototype.

Unknown 1:08:03
Oh, please, please.

Unknown 1:08:05
We have time. Let's do that.

Unknown 1:08:07
Let's do it. Let's do it. I'll take pictures. Like, yeah. Do you want the transcript, too? Proto, you want transcript? That'd be great. I'm gonna stop recording and like an agent for each of us, then we can share information. Yeah?

Unknown 1:08:22
But information all over the kitchen.

This transcript was generated by https://otter.ai